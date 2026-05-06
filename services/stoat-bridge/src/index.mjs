import dotenv from 'dotenv';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const {
  PORT = 7070,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  STOAT_API_BASE,
  STOAT_API_TOKEN,
  STOAT_SHARED_SECRET,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

if (!STOAT_API_BASE || !STOAT_API_TOKEN) {
  throw new Error('Missing STOAT_API_BASE or STOAT_API_TOKEN');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const app = express();
app.use(express.json({ limit: '1mb' }));

function buildHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${STOAT_API_TOKEN}`,
    ...extra,
  };
}

async function stoatRequest(path, payload) {
  const res = await fetch(`${STOAT_API_BASE.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stoat API ${res.status}: ${text}`);
  }

  return res.json().catch(() => ({}));
}

async function upsertStoatBotIdentity({ externalUserId, displayName, avatarUrl = null }) {
  await stoatRequest('/bots/upsert', {
    external_user_id: externalUserId,
    display_name: displayName,
    avatar_url: avatarUrl,
    platform: 'thechatbox',
  });
}

async function ensureStoatBotIdentity(message) {
  const externalUserId = `thechatbox:${message.author_email || message.author_name || 'unknown'}`;
  await upsertStoatBotIdentity({
    externalUserId,
    displayName: message.author_name || message.author_email || 'Thechatbox User',
  });

  return externalUserId;
}

async function mirrorMessageToStoat(message) {
  if (message.bridge_source === 'stoat') return;

  const botExternalUserId = await ensureStoatBotIdentity(message);

  await stoatRequest('/bridge/messages', {
    platform: 'thechatbox',
    server_id: message.server_id || 'main',
    channel_id: message.channel_id,
    external_message_id: message.id,
    content: message.content,
    message_type: message.message_type || 'text',
    sent_at: message.created_at,
    bot_external_user_id: botExternalUserId,
  });
}

async function syncServerToStoat(serverId) {
  const { data: server, error: serverError } = await supabase
    .from('servers')
    .select('*')
    .eq('id', serverId)
    .maybeSingle();

  if (serverError) throw serverError;
  if (!server) throw new Error(`Server not found: ${serverId}`);

  const { data: channels, error: channelsError } = await supabase
    .from('channels')
    .select('*')
    .eq('server_id', serverId);

  if (channelsError) throw channelsError;

  await stoatRequest('/bridge/servers/sync', {
    platform: 'thechatbox',
    server: {
      id: server.id,
      name: server.name,
      description: server.description,
      icon: server.icon,
      is_public: server.is_public,
    },
    channels: channels || [],
  });
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'thechatbox-stoat-bridge' });
});

app.post('/sync/server/:serverId', async (req, res) => {
  try {
    if (STOAT_SHARED_SECRET && req.headers['x-shared-secret'] !== STOAT_SHARED_SECRET) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }

    await syncServerToStoat(req.params.serverId);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/sync/user', async (req, res) => {
  try {
    if (STOAT_SHARED_SECRET && req.headers['x-shared-secret'] !== STOAT_SHARED_SECRET) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }

    const user = req.body || {};
    if (!user.email) {
      res.status(400).json({ ok: false, error: 'email is required' });
      return;
    }

    await upsertStoatBotIdentity({
      externalUserId: `thechatbox:${user.email}`,
      displayName: user.full_name || user.email,
      avatarUrl: user.avatar_url || null,
    });

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/stoat/inbound', async (req, res) => {
  try {
    if (STOAT_SHARED_SECRET && req.headers['x-shared-secret'] !== STOAT_SHARED_SECRET) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }

    const body = req.body || {};
    const channelId = body.channel_id;
    const content = body.content;

    if (!channelId || !content) {
      res.status(400).json({ ok: false, error: 'channel_id and content are required' });
      return;
    }

    const authorName = body.author_name || body.author_username || 'Stoat User';
    const authorEmail = body.author_email || `stoat+${body.author_id || 'user'}@bridge.local`;

    const { error } = await supabase.from('messages').insert({
      channel_id: channelId,
      content,
      author_name: authorName,
      author_email: authorEmail,
      message_type: body.message_type || 'text',
      bridge_source: 'stoat',
    });

    if (error) throw error;

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

const realtimeChannel = supabase
  .channel('bridge:messages')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
    try {
      await mirrorMessageToStoat(payload.new);
    } catch (error) {
      console.error('[bridge] mirror failed:', error.message);
    }
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('[bridge] Realtime subscription active');
    }
  });

app.listen(PORT, () => {
  console.log(`[bridge] listening on :${PORT}`);
});

process.on('SIGINT', async () => {
  await supabase.removeChannel(realtimeChannel);
  process.exit(0);
});
