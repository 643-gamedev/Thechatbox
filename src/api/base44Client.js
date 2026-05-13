import { requireSupabase, supabase, storageBucket } from '@/lib/supabaseClient';

const ENTITY_TO_TABLE = {
  Channel: 'channels',
  CodeSnippet: 'code_snippets',
  DirectMessage: 'direct_messages',
  FriendRequest: 'friend_requests',
  GuestSession: 'guest_sessions',
  Message: 'messages',
  PhoneCall: 'phone_calls',
  PhoneNumber: 'phone_numbers',
  Server: 'servers',
  ServerMember: 'server_members',
  User: 'profiles',
};

const SORT_FIELD_MAP = {
  created_date: 'created_at',
  updated_date: 'updated_at',
};

function normalizeSortField(field) {
  return SORT_FIELD_MAP[field] || field;
}

function normalizeWritePayload(payload = {}) {
  const next = { ...payload };
  if (next.created_date && !next.created_at) next.created_at = next.created_date;
  if (next.updated_date && !next.updated_at) next.updated_at = next.updated_date;
  delete next.created_date;
  delete next.updated_date;
  return next;
}

function normalizeReadRow(row) {
  if (!row || typeof row !== 'object') return row;
  return {
    ...row,
    created_date: row.created_at || row.created_date || null,
    updated_date: row.updated_at || row.updated_date || null,
  };
}

function applyFilters(query, criteria = {}) {
  let next = query;
  Object.entries(criteria).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      next = next.in(key, value);
      return;
    }
    next = next.eq(key, value);
  });
  return next;
}

function parseSort(sort = 'created_at') {
  if (!sort || typeof sort !== 'string') {
    return { field: 'created_at', ascending: true };
  }
  const descending = sort.startsWith('-');
  const field = normalizeSortField(descending ? sort.slice(1) : sort);
  return { field, ascending: !descending };
}

async function ensureProfileRow(user) {
  const client = requireSupabase();
  if (!user?.id || !user?.email) return null;

  const profilePayload = {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email,
  };

  const { data, error } = await client
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeReadRow(data);
}

async function getCurrentUserWithProfile() {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const authUser = userData?.user;
  if (!authUser) throw new Error('Not authenticated');

  const profile = await ensureProfileRow(authUser);
  return {
    ...profile,
    id: authUser.id,
    email: authUser.email,
    full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email,
    avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url || null,
  };
}

function createEntityApi(entityName) {
  const table = ENTITY_TO_TABLE[entityName];
  if (!table) {
    return {
      list: async () => [],
      filter: async () => [],
      get: async () => null,
      create: async () => ({}),
      update: async () => ({}),
      delete: async () => ({}),
      subscribe: () => () => {},
    };
  }

  return {
    async list(sort = '-created_at', limit = 200) {
      const client = requireSupabase();
      const { field, ascending } = parseSort(sort);
      const { data, error } = await client
        .from(table)
        .select('*')
        .order(field, { ascending })
        .limit(limit);

      if (error) throw error;
      return (data || []).map(normalizeReadRow);
    },

    async filter(criteria = {}, sort = 'created_at', limit = 200) {
      const client = requireSupabase();
      const { field, ascending } = parseSort(sort);

      let query = client.from(table).select('*');
      query = applyFilters(query, criteria);
      query = query.order(field, { ascending });
      if (typeof limit === 'number' && Number.isFinite(limit)) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(normalizeReadRow);
    },

    async get(id) {
      const client = requireSupabase();
      const { data, error } = await client.from(table).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return normalizeReadRow(data);
    },

    async create(payload) {
      const client = requireSupabase();
      const { data, error } = await client
        .from(table)
        .insert(normalizeWritePayload(payload))
        .select('*')
        .single();
      if (error) throw error;
      return normalizeReadRow(data);
    },

    async update(id, payload) {
      const client = requireSupabase();
      const { data, error } = await client
        .from(table)
        .update(normalizeWritePayload(payload))
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return normalizeReadRow(data);
    },

    async delete(id) {
      const client = requireSupabase();
      const { data, error } = await client
        .from(table)
        .delete()
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return normalizeReadRow(data || { id });
    },

    subscribe(callback) {
      const client = requireSupabase();
      const channelName = `entity:${table}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
      const channel = client
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          const typeMap = {
            INSERT: 'create',
            UPDATE: 'update',
            DELETE: 'delete',
          };
          const eventType = typeMap[payload.eventType] || payload.eventType?.toLowerCase();
          const raw = payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old;
          callback({
            type: eventType,
            data: normalizeReadRow(raw),
            raw: payload,
          });
        })
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    },
  };
}

const entitiesProxy = new Proxy(
  {},
  {
    get(_target, entityName) {
      return createEntityApi(entityName);
    },
  },
);

async function uploadFileToStorage({ file }) {
  const client = requireSupabase();
  if (!file) {
    throw new Error('file is required');
  }

  const ext = file.name?.includes('.') ? file.name.split('.').pop() : 'bin';
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error: uploadError } = await client.storage.from(storageBucket).upload(path, file, {
    upsert: false,
    cacheControl: '3600',
  });
  if (uploadError) throw uploadError;

  const { data } = client.storage.from(storageBucket).getPublicUrl(path);
  return { file_url: data.publicUrl };
}

async function invokeLLM({ prompt }) {
  const proxyUrl = import.meta.env.VITE_LLM_PROXY_URL;
  if (!proxyUrl) {
    return {
      text: `LLM proxy not configured. Set VITE_LLM_PROXY_URL. Prompt preview:\n${prompt || ''}`,
    };
  }

  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM proxy ${res.status}: ${text}`);
  }

  const data = await res.json().catch(() => ({}));
  return data;
}

export const db = {
  auth: {
    async isAuthenticated() {
      if (!supabase) return false;
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return Boolean(data.session?.user);
    },

    async me() {
      return getCurrentUserWithProfile();
    },

    async signUpWithPassword({ email, password, fullName }) {
      const client = requireSupabase();
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName || email },
        },
      });
      if (error) throw error;

      if (data.user) {
        await ensureProfileRow(data.user);
      }
      return data;
    },

    async signInWithPassword({ email, password }) {
      const client = requireSupabase();
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) {
        await ensureProfileRow(data.user);
      }
      return data;
    },

    async signInWithOAuth({ provider, redirectTo, scopes } = {}) {
      const client = requireSupabase();
      if (!provider) {
        throw new Error('provider is required for OAuth sign-in');
      }

      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          scopes,
        },
      });
      if (error) throw error;
      return data;
    },

    async updateMe(updates = {}) {
      const client = requireSupabase();
      const me = await getCurrentUserWithProfile();

      const { data, error } = await client
        .from('profiles')
        .update(normalizeWritePayload(updates))
        .eq('id', me.id)
        .select('*')
        .single();
      if (error) throw error;

      return normalizeReadRow(data);
    },

    async logout(redirectUrl) {
      if (supabase) {
        await supabase.auth.signOut();
      }
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    },

    redirectToLogin(redirectUrl) {
      window.location.href = redirectUrl || window.location.origin;
    },
  },

  entities: entitiesProxy,

  integrations: {
    Core: {
      UploadFile: uploadFileToStorage,
      InvokeLLM: invokeLLM,
    },
  },
};

if (typeof globalThis !== 'undefined') {
  globalThis.db = db;
  globalThis.base44 = db;
}

export const base44 = db;
export default db;
