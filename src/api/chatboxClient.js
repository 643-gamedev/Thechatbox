import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'uploads';
const LLM_PROXY_URL = import.meta.env.VITE_LLM_PROXY_URL;
const STOAT_BRIDGE_URL = import.meta.env.VITE_STOAT_BRIDGE_URL;
const STOAT_BRIDGE_SHARED_SECRET = import.meta.env.VITE_STOAT_BRIDGE_SHARED_SECRET;

const ENTITY_CONFIG = {
  User: { table: 'profiles' },
  Channel: { table: 'channels' },
  CodeSnippet: { table: 'code_snippets' },
  DirectMessage: { table: 'direct_messages' },
  FriendRequest: { table: 'friend_requests' },
  GuestSession: { table: 'guest_sessions' },
  Message: { table: 'messages' },
  PhoneCall: { table: 'phone_calls' },
  PhoneNumber: { table: 'phone_numbers' },
  Server: { table: 'servers' },
  ServerMember: { table: 'server_members' },
};

const missingSupabaseConfig = !SUPABASE_URL || !SUPABASE_ANON_KEY;

const supabase = missingSupabaseConfig
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

function mapSortColumn(input) {
  if (!input) return 'created_at';
  const key = input.replace(/^-/, '');
  if (key === 'created_date') return 'created_at';
  if (key === 'updated_date') return 'updated_at';
  return key;
}

function normalizeRow(row) {
  if (!row) return row;
  const next = { ...row };
  if (Object.prototype.hasOwnProperty.call(next, 'created_at') && !next.created_date) {
    next.created_date = next.created_at;
  }
  if (Object.prototype.hasOwnProperty.call(next, 'updated_at') && !next.updated_date) {
    next.updated_date = next.updated_at;
  }
  return next;
}

function normalizeRows(rows) {
  return (rows || []).map(normalizeRow);
}

function ensureConfigured() {
  if (!supabase) {
    const error = new Error('Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    error.status = 500;
    throw error;
  }
}

async function getSession() {
  ensureConfigured();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function ensureProfile(user) {
  if (!user) return null;

  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) return normalizeRow(existing);

  const fallbackName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email,
      full_name: fallbackName,
      role: 'user',
      banned: false,
      theme: 'matrix',
    })
    .select('*')
    .single();

  if (insertError) throw insertError;
  return normalizeRow(inserted);
}

function mergeUserAndProfile(user, profile) {
  return {
    id: user.id,
    email: user.email,
    full_name: profile?.full_name || user.user_metadata?.full_name || user.email,
    avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
    bio: profile?.bio || '',
    role: profile?.role || 'user',
    banned: !!profile?.banned,
    ban_reason: profile?.ban_reason || '',
    theme: profile?.theme || 'matrix',
    created_date: profile?.created_at || user.created_at,
    updated_date: profile?.updated_at || user.updated_at,
  };
}

async function getCurrentUserOrThrow() {
  const session = await getSession();
  if (!session?.user) {
    const error = new Error('Not authenticated');
    error.status = 401;
    throw error;
  }

  const profile = await ensureProfile(session.user);
  if (profile?.banned) {
    const error = new Error(profile.ban_reason || 'This account is banned');
    error.status = 403;
    throw error;
  }

  return mergeUserAndProfile(session.user, profile);
}

async function getCurrentUserOrNull() {
  try {
    return await getCurrentUserOrThrow();
  } catch (error) {
    if (error?.status === 401) return null;
    throw error;
  }
}

async function syncStoatUser(user) {
  if (!STOAT_BRIDGE_URL || !user?.email) return;

  try {
    await fetch(`${STOAT_BRIDGE_URL.replace(/\/$/, '')}/sync/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(STOAT_BRIDGE_SHARED_SECRET ? { 'x-shared-secret': STOAT_BRIDGE_SHARED_SECRET } : {}),
      },
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        full_name: user.full_name || user.email,
        avatar_url: user.avatar_url || null,
      }),
    });
  } catch {
    // non-fatal; bridge sync can be retried server-side
  }
}

async function bootstrapDefaultsIfNeeded() {
  ensureConfigured();

  const { data: existingChannels, error: channelsError } = await supabase
    .from('channels')
    .select('id')
    .eq('server_id', 'main')
    .limit(1);

  if (channelsError) throw channelsError;

  if (!existingChannels || existingChannels.length === 0) {
    await supabase.from('channels').insert([
      {
        name: 'general',
        description: 'General discussion',
        category: 'text',
        server_id: 'main',
      },
      {
        name: 'code',
        description: 'Share snippets and pair-program',
        category: 'code',
        server_id: 'main',
      },
      {
        name: 'voice-lounge',
        description: 'Open voice channel for the community',
        category: 'voice',
        server_id: 'main',
      },
    ]);
  }

  const { data: existingServer, error: serverError } = await supabase
    .from('servers')
    .select('id')
    .eq('is_main', true)
    .limit(1);

  if (serverError) throw serverError;

  if (!existingServer || existingServer.length === 0) {
    await supabase.from('servers').insert({
      id: 'main',
      name: 'THECHATBOX',
      description: 'Global community server',
      is_public: true,
      is_main: true,
      icon: '🦦',
      owner_email: 'system@thechatbox.local',
      member_count: 0,
    });
  }
}

function createEntityClient(entityName) {
  const config = ENTITY_CONFIG[entityName];
  if (!config) {
    throw new Error(`Unknown entity: ${entityName}`);
  }

  const { table } = config;

  const applyFilters = (query, filters = {}) => {
    let next = query;
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value === undefined) return;
      if (value === null) next = next.is(key, null);
      else next = next.eq(key, value);
    });
    return next;
  };

  const applySort = (query, sortSpec = '-created_date') => {
    const descending = String(sortSpec).startsWith('-');
    const column = mapSortColumn(sortSpec);
    return query.order(column, { ascending: !descending, nullsFirst: false });
  };

  return {
    async list(sortSpec = '-created_date', limit = 100) {
      ensureConfigured();
      let query = supabase.from(table).select('*');
      query = applySort(query, sortSpec);
      query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return normalizeRows(data);
    },

    async filter(filters = {}, sortSpec = 'created_date', limit = 200) {
      ensureConfigured();
      let query = supabase.from(table).select('*');
      query = applyFilters(query, filters);
      query = applySort(query, sortSpec);
      query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return normalizeRows(data);
    },

    async get(id) {
      ensureConfigured();
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return normalizeRow(data);
    },

    async create(payload) {
      ensureConfigured();
      const { data, error } = await supabase
        .from(table)
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return normalizeRow(data);
    },

    async update(id, payload) {
      ensureConfigured();
      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return normalizeRow(data);
    },

    async delete(id) {
      ensureConfigured();
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return true;
    },

    subscribe(callback) {
      ensureConfigured();
      const channel = supabase
        .channel(`table:${table}:${Math.random().toString(36).slice(2)}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            const type = payload.eventType === 'INSERT'
              ? 'create'
              : payload.eventType === 'UPDATE'
              ? 'update'
              : 'delete';

            callback({
              type,
              data: normalizeRow(payload.new || payload.old),
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
  };
}

const entities = new Proxy(
  {},
  {
    get(_target, entityName) {
      return createEntityClient(entityName);
    },
  }
);

const auth = {
  async isAuthenticated() {
    const session = await getSession();
    return !!session?.user;
  },

  async me() {
    return getCurrentUserOrThrow();
  },

  async signIn(email, password) {
    ensureConfigured();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const user = data?.user || (await getSession())?.user;
    if (user) {
      await ensureProfile(user);
    }
    const userWithProfile = await getCurrentUserOrThrow();
    await syncStoatUser(userWithProfile);
    return userWithProfile;
  },

  async signUp({ email, password, fullName }) {
    ensureConfigured();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) throw error;

    if (data?.user && data?.session) {
      await ensureProfile(data.user);
      const userWithProfile = await getCurrentUserOrThrow();
      await syncStoatUser(userWithProfile);
      return userWithProfile;
    }

    return {
      pendingVerification: true,
      message: 'Check your email to verify your account.',
    };
  },

  async updateMe(patch) {
    ensureConfigured();
    const session = await getSession();
    if (!session?.user) {
      const error = new Error('Not authenticated');
      error.status = 401;
      throw error;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', session.user.id)
      .select('*')
      .single();

    if (error) throw error;

    return mergeUserAndProfile(session.user, normalizeRow(data));
  },

  async logout(redirectUrl) {
    ensureConfigured();
    await supabase.auth.signOut();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  },

  redirectToLogin(redirectUrl = window.location.pathname) {
    const params = new URLSearchParams();
    params.set('auth', '1');
    params.set('redirect', redirectUrl);
    window.location.href = `/?${params.toString()}`;
  },

  onAuthStateChange(handler) {
    ensureConfigured();
    const subscription = supabase.auth.onAuthStateChange((_event, session) => {
      handler(session);
    });
    return () => subscription.data.subscription.unsubscribe();
  },
};

const integrations = {
  Core: {
    async UploadFile({ file }) {
      ensureConfigured();
      if (!file) throw new Error('No file provided');

      const session = await getSession();
      const userId = session?.user?.id || 'anonymous';
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const path = `${userId}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          upsert: false,
          cacheControl: '3600',
          contentType: file.type || undefined,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      return { file_url: data.publicUrl };
    },

    async InvokeLLM({ prompt }) {
      if (!LLM_PROXY_URL) {
        return 'Code simulator is not configured. Set VITE_LLM_PROXY_URL to enable this feature.';
      }

      const response = await fetch(LLM_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`LLM proxy error (${response.status})`);
      }

      const payload = await response.json();
      return payload.output || payload.result || payload.text || '';
    },
  },
};

const db = {
  supabase,
  auth,
  entities,
  integrations,
  bootstrapDefaultsIfNeeded,
};

export default db;
