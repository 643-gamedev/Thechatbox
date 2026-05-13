import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceRoot = path.resolve(__dirname, '..');

const PORT = Number(process.env.PORT || 7070);
const HTTP_HOST = process.env.HTTP_HOST || '127.0.0.1';
const LOCAL_WS_HOST = process.env.LOCAL_WS_HOST || '127.0.0.1';
const LOCAL_WS_PORT = Number(process.env.LOCAL_WS_PORT || 8080);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const DISCORD_API_BASE = (process.env.DISCORD_API_BASE || 'https://discord.com/api/v10').replace(/\/$/, '');
const DISCORD_GATEWAY_URL =
  process.env.DISCORD_GATEWAY_URL || 'wss://gateway.discord.gg/?v=10&encoding=json';
const DISCORD_GATEWAY_INTENTS = Number(process.env.DISCORD_GATEWAY_INTENTS || 33280); // GUILD_MESSAGES + MESSAGE_CONTENT

const STOAT_API_BASE = (process.env.STOAT_API_BASE || 'https://api.stoat.chat').replace(/\/$/, '');
const STOAT_BOT_TOKEN = process.env.STOAT_BOT_TOKEN || '';
const STOAT_EVENTS_URL =
  process.env.STOAT_EVENTS_URL || 'wss://stoat.chat/events?version=1&format=json';

const CHANNEL_MAP_FILE =
  process.env.CHANNEL_MAP_FILE || path.join(serviceRoot, 'channel-map.json');
const DISCOVER_SERVERS_FILE =
  process.env.DISCOVER_SERVERS_FILE || path.join(serviceRoot, 'discover-servers.json');
const BRIDGE_SHARED_SECRET = process.env.BRIDGE_SHARED_SECRET || '';

const localClients = new Set();
const discordWebhookCache = new Map();
const stoatUserCache = new Map();

let discordSocket = null;
let discordHeartbeat = null;
let stoatSocket = null;
let stoatPing = null;

let channelLookup = buildChannelLookup(loadChannelMapFile(CHANNEL_MAP_FILE));
let discoverCatalog = loadDiscoverCatalog(DISCOVER_SERVERS_FILE);

const NSFW_TERMS = [
  'nsfw',
  '18+',
  'adult',
  'porn',
  'sex',
  'erotic',
  'hentai',
  'fetish',
];

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function safeJsonParse(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizeMapping(raw) {
  if (!isObject(raw)) return null;
  const localChannelId = raw.localChannelId || raw.local_channel_id;
  if (!localChannelId) return null;
  return {
    localChannelId: String(localChannelId),
    discordChannelId: raw.discordChannelId ? String(raw.discordChannelId) : null,
    stoatChannelId: raw.stoatChannelId ? String(raw.stoatChannelId) : null,
    stoatServerId: raw.stoatServerId ? String(raw.stoatServerId) : null,
    discordWebhookId: raw.discordWebhookId ? String(raw.discordWebhookId) : null,
    discordWebhookToken: raw.discordWebhookToken ? String(raw.discordWebhookToken) : null,
  };
}

function buildChannelLookup(rawMap) {
  const byLocal = new Map();
  const byDiscord = new Map();
  const byStoat = new Map();

  const list = Array.isArray(rawMap?.channels) ? rawMap.channels : [];
  list.forEach((entry) => {
    const mapping = normalizeMapping(entry);
    if (!mapping) return;
    byLocal.set(mapping.localChannelId, mapping);
    if (mapping.discordChannelId) byDiscord.set(mapping.discordChannelId, mapping.localChannelId);
    if (mapping.stoatChannelId) byStoat.set(mapping.stoatChannelId, mapping.localChannelId);
  });

  return { byLocal, byDiscord, byStoat };
}

function loadJsonFile(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    return safeJsonParse(raw, fallback);
  } catch (error) {
    console.error('[bridge] failed to read JSON file:', filePath, error.message);
    return fallback;
  }
}

function loadChannelMapFile(filePath) {
  return loadJsonFile(filePath, { channels: [] });
}

function loadDiscoverCatalog(filePath) {
  return loadJsonFile(filePath, { discord: [], stoat: [] });
}

function reloadConfig() {
  channelLookup = buildChannelLookup(loadChannelMapFile(CHANNEL_MAP_FILE));
  discoverCatalog = loadDiscoverCatalog(DISCOVER_SERVERS_FILE);
  console.log('[bridge] config reloaded');
}

function isSafeServer(server) {
  if (!isObject(server)) return false;
  if (server.nsfw || server.is_nsfw || server.age_restricted) return false;
  const haystack = `${server.name || ''} ${server.description || ''}`.toLowerCase();
  return !NSFW_TERMS.some((term) => haystack.includes(term));
}

function filterSafeServers(servers) {
  return (servers || []).filter(isSafeServer);
}

function sendJson(ws, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function broadcastToLocal(payload) {
  const encoded = JSON.stringify(payload);
  for (const client of localClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(encoded);
    }
  }
}

function toStandardPacket({
  localChannelId,
  source,
  text,
  authorUsername,
  authorAvatarUrl = null,
}) {
  return {
    type: 'message',
    local_channel_id: localChannelId,
    source,
    text,
    author: {
      username: authorUsername || 'Unknown User',
      avatar_url: authorAvatarUrl,
    },
    timestamp: new Date().toISOString(),
  };
}

function parseLocalOutboundPayload(payload) {
  if (!isObject(payload)) return null;
  const localChannelId = payload.local_channel_id || payload.localChannelId || payload.channel_id;
  const text = payload.text || payload.content || payload.message;
  const author = isObject(payload.author) ? payload.author : {};
  const authorUsername =
    author.username || payload.author_name || payload.authorName || payload.username || 'Local User';
  const authorAvatarUrl = author.avatar_url || author.avatarUrl || payload.author_avatar_url || null;

  if (!localChannelId || !text) return null;
  return {
    localChannelId: String(localChannelId),
    text: String(text),
    authorUsername: String(authorUsername),
    authorAvatarUrl: authorAvatarUrl ? String(authorAvatarUrl) : null,
  };
}

async function discordApi(pathname, { method = 'GET', body } = {}) {
  if (!DISCORD_BOT_TOKEN) throw new Error('DISCORD_BOT_TOKEN is missing');
  const res = await fetch(`${DISCORD_API_BASE}${pathname}`, {
    method,
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API ${res.status}: ${text}`);
  }

  return res.json().catch(() => ({}));
}

async function getOrCreateDiscordWebhook(mapping) {
  const channelId = mapping.discordChannelId;
  if (!channelId) return null;

  const cached = discordWebhookCache.get(channelId);
  if (cached?.id && cached?.token) {
    return cached;
  }

  if (mapping.discordWebhookId && mapping.discordWebhookToken) {
    const webhook = {
      id: mapping.discordWebhookId,
      token: mapping.discordWebhookToken,
    };
    discordWebhookCache.set(channelId, webhook);
    return webhook;
  }

  // Fetch existing channel webhooks and reuse bridge-owned webhook if possible.
  const existing = await discordApi(`/channels/${channelId}/webhooks`);
  const found = (existing || []).find((hook) => hook?.token);
  if (found?.id && found?.token) {
    const webhook = { id: found.id, token: found.token };
    discordWebhookCache.set(channelId, webhook);
    return webhook;
  }

  // Create a dedicated webhook to allow username/avatar overrides per message.
  const created = await discordApi(`/channels/${channelId}/webhooks`, {
    method: 'POST',
    body: { name: 'Thechatbox Bridge' },
  });

  if (!created?.id || !created?.token) {
    throw new Error(`Failed to create Discord webhook for channel ${channelId}`);
  }

  const webhook = { id: created.id, token: created.token };
  discordWebhookCache.set(channelId, webhook);
  return webhook;
}

async function relayOutboundToDiscord(mapping, outbound) {
  if (!mapping.discordChannelId || !DISCORD_BOT_TOKEN) return;

  const webhook = await getOrCreateDiscordWebhook(mapping);
  if (!webhook) return;

  const endpoint = `${DISCORD_API_BASE}/webhooks/${webhook.id}/${webhook.token}?wait=true`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: outbound.text,
      username: outbound.authorUsername,
      avatar_url: outbound.authorAvatarUrl || undefined,
      allowed_mentions: { parse: [] },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord webhook ${res.status}: ${text}`);
  }
}

async function relayOutboundToStoat(mapping, outbound) {
  if (!mapping.stoatChannelId || !STOAT_BOT_TOKEN) return;

  const res = await fetch(`${STOAT_API_BASE}/channels/${mapping.stoatChannelId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Bot-Token': STOAT_BOT_TOKEN,
      Authorization: `Bearer ${STOAT_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      content: `[${outbound.authorUsername}] ${outbound.text}`,
      masquerade: {
        name: outbound.authorUsername,
        avatar: outbound.authorAvatarUrl || null,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stoat API ${res.status}: ${text}`);
  }
}

async function handleLocalOutbound(ws, rawMessage) {
  try {
    const parsed = safeJsonParse(rawMessage, null);
    const outbound = parseLocalOutboundPayload(parsed);
    if (!outbound) {
      sendJson(ws, {
        type: 'error',
        error: 'Invalid payload. Expected local_channel_id and text/content.',
      });
      return;
    }

    const mapping = channelLookup.byLocal.get(outbound.localChannelId);
    if (!mapping) {
      sendJson(ws, {
        type: 'error',
        error: `No channel mapping found for local channel ${outbound.localChannelId}.`,
      });
      return;
    }

    // Outbound data flow: Local WebSocket message -> relay to both external platforms.
    const [discordResult, stoatResult] = await Promise.allSettled([
      relayOutboundToDiscord(mapping, outbound),
      relayOutboundToStoat(mapping, outbound),
    ]);

    sendJson(ws, {
      type: 'ack',
      local_channel_id: outbound.localChannelId,
      discord: discordResult.status,
      stoat: stoatResult.status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[bridge] local outbound failed:', error.message);
    sendJson(ws, {
      type: 'error',
      error: error.message,
    });
  }
}

function connectLocalWsServer() {
  const wss = new WebSocketServer({
    host: LOCAL_WS_HOST,
    port: LOCAL_WS_PORT,
  });

  wss.on('connection', (ws) => {
    localClients.add(ws);
    sendJson(ws, {
      type: 'ready',
      message: 'Connected to thechatbox bridge',
    });

    ws.on('message', (raw) => {
      handleLocalOutbound(ws, raw.toString());
    });

    // Cleanup closed sockets to prevent memory leaks.
    ws.on('close', () => {
      localClients.delete(ws);
    });

    ws.on('error', () => {
      localClients.delete(ws);
    });
  });

  wss.on('listening', () => {
    console.log(`[bridge] local ws listening on ${LOCAL_WS_HOST}:${LOCAL_WS_PORT}`);
  });

  wss.on('error', (error) => {
    console.error(`[bridge] local ws error on ${LOCAL_WS_HOST}:${LOCAL_WS_PORT}:`, error.message);
  });

  return wss;
}

function stopDiscordHeartbeat() {
  if (discordHeartbeat) {
    clearInterval(discordHeartbeat);
    discordHeartbeat = null;
  }
}

function handleDiscordGatewayMessage(packetRaw) {
  const packet = safeJsonParse(packetRaw, null);
  if (!packet) return;

  if (packet.op === 10 && packet.d?.heartbeat_interval) {
    const interval = Number(packet.d.heartbeat_interval);
    stopDiscordHeartbeat();
    discordHeartbeat = setInterval(() => {
      if (discordSocket?.readyState === WebSocket.OPEN) {
        discordSocket.send(JSON.stringify({ op: 1, d: null }));
      }
    }, interval);

    discordSocket.send(
      JSON.stringify({
        op: 2,
        d: {
          token: DISCORD_BOT_TOKEN,
          intents: DISCORD_GATEWAY_INTENTS,
          properties: {
            os: 'linux',
            browser: 'thechatbox-bridge',
            device: 'thechatbox-bridge',
          },
        },
      }),
    );
    return;
  }

  if (packet.op !== 0) return;
  if (packet.t !== 'MESSAGE_CREATE') return;

  const event = packet.d || {};
  if (event.author?.bot) return;

  const localChannelId = channelLookup.byDiscord.get(String(event.channel_id || ''));
  if (!localChannelId) return;

  // Inbound data flow: Discord gateway event -> mapped local channel -> broadcast to local clients.
  broadcastToLocal(
    toStandardPacket({
      localChannelId,
      source: 'discord',
      text: event.content || '',
      authorUsername: event.author?.global_name || event.author?.username || 'Discord User',
      authorAvatarUrl: event.author?.avatar
        ? `https://cdn.discordapp.com/avatars/${event.author.id}/${event.author.avatar}.png`
        : null,
    }),
  );
}

function connectDiscordGateway() {
  if (!DISCORD_BOT_TOKEN) {
    console.warn('[bridge] DISCORD_BOT_TOKEN not set; Discord relay disabled');
    return;
  }

  const connect = () => {
    discordSocket = new WebSocket(DISCORD_GATEWAY_URL);

    discordSocket.on('message', (raw) => {
      try {
        handleDiscordGatewayMessage(raw.toString());
      } catch (error) {
        console.error('[bridge] discord gateway handler error:', error.message);
      }
    });

    discordSocket.on('close', () => {
      stopDiscordHeartbeat();
      setTimeout(connect, 5000);
    });

    discordSocket.on('error', () => {
      stopDiscordHeartbeat();
      try {
        discordSocket.close();
      } catch {
        // no-op
      }
    });
  };

  connect();
}

function stopStoatPing() {
  if (stoatPing) {
    clearInterval(stoatPing);
    stoatPing = null;
  }
}

function rememberStoatUsersFromReady(event) {
  if (!Array.isArray(event?.users)) return;
  event.users.forEach((user) => {
    if (user?._id) {
      stoatUserCache.set(user._id, user);
    }
  });
}

function resolveStoatAuthor(message) {
  const userId = message.author || message.user || message.author_id || null;
  const cachedUser = userId ? stoatUserCache.get(userId) : null;
  const bot = Boolean(cachedUser?.bot || message?.webhook);
  const username =
    message?.masquerade?.name ||
    cachedUser?.display_name ||
    cachedUser?.username ||
    message?.username ||
    'Stoat User';
  const avatarUrl = message?.masquerade?.avatar || cachedUser?.avatar || null;
  return { bot, username, avatarUrl };
}

function handleStoatEvent(event) {
  if (!isObject(event)) return;

  if (event.type === 'Bulk' && Array.isArray(event.v)) {
    event.v.forEach((inner) => handleStoatEvent(inner));
    return;
  }

  if (event.type === 'Ready') {
    rememberStoatUsersFromReady(event);
    return;
  }

  if (event.type === 'UserUpdate' && event.id && isObject(event.data)) {
    const prev = stoatUserCache.get(event.id) || { _id: event.id };
    stoatUserCache.set(event.id, { ...prev, ...event.data });
    return;
  }

  if (event.type !== 'Message') return;

  const stoatChannelId = String(event.channel || event.channel_id || '');
  const localChannelId = channelLookup.byStoat.get(stoatChannelId);
  if (!localChannelId) return;

  const author = resolveStoatAuthor(event);
  if (author.bot) return;

  // Inbound data flow: Stoat gateway event -> mapped local channel -> broadcast to local clients.
  broadcastToLocal(
    toStandardPacket({
      localChannelId,
      source: 'stoat',
      text: event.content || '',
      authorUsername: author.username,
      authorAvatarUrl: author.avatarUrl,
    }),
  );
}

function connectStoatGateway() {
  if (!STOAT_BOT_TOKEN) {
    console.warn('[bridge] STOAT_BOT_TOKEN not set; Stoat relay disabled');
    return;
  }

  const connect = () => {
    stoatSocket = new WebSocket(STOAT_EVENTS_URL);

    stoatSocket.on('open', () => {
      stoatSocket.send(
        JSON.stringify({
          type: 'Authenticate',
          token: STOAT_BOT_TOKEN,
        }),
      );

      // Keep Stoat gateway sessions alive.
      stopStoatPing();
      stoatPing = setInterval(() => {
        if (stoatSocket?.readyState === WebSocket.OPEN) {
          stoatSocket.send(
            JSON.stringify({
              type: 'Ping',
              data: Date.now(),
            }),
          );
        }
      }, 20_000);
    });

    stoatSocket.on('message', (raw) => {
      try {
        const event = safeJsonParse(raw.toString(), null);
        handleStoatEvent(event);
      } catch (error) {
        console.error('[bridge] stoat gateway handler error:', error.message);
      }
    });

    stoatSocket.on('close', () => {
      stopStoatPing();
      setTimeout(connect, 5000);
    });

    stoatSocket.on('error', () => {
      stopStoatPing();
      try {
        stoatSocket.close();
      } catch {
        // no-op
      }
    });
  };

  connect();
}

function getDiscoverSourceList(source) {
  if (source === 'discord') return filterSafeServers(discoverCatalog.discord);
  if (source === 'stoat') return filterSafeServers(discoverCatalog.stoat);
  return [];
}

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'thechatbox-stoat-bridge',
    local_ws_host: LOCAL_WS_HOST,
    local_ws_port: LOCAL_WS_PORT,
    connected_clients: localClients.size,
  });
});

app.get('/channel-map', (req, res) => {
  if (BRIDGE_SHARED_SECRET && req.headers['x-shared-secret'] !== BRIDGE_SHARED_SECRET) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  res.json({
    ok: true,
    channels: Array.from(channelLookup.byLocal.values()).map((row) => ({
      localChannelId: row.localChannelId,
      discordChannelId: row.discordChannelId,
      stoatChannelId: row.stoatChannelId,
    })),
  });
});

app.get('/discover/servers', (req, res) => {
  const source = String(req.query.source || '').toLowerCase();
  if (!['discord', 'stoat'].includes(source)) {
    res.status(400).json({
      ok: false,
      error: 'source must be "discord" or "stoat"',
    });
    return;
  }

  res.json({
    ok: true,
    source,
    servers: getDiscoverSourceList(source),
  });
});

app.post('/reload', (req, res) => {
  if (BRIDGE_SHARED_SECRET && req.headers['x-shared-secret'] !== BRIDGE_SHARED_SECRET) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  try {
    reloadConfig();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

const localWss = connectLocalWsServer();
connectDiscordGateway();
connectStoatGateway();

const httpServer = app.listen(PORT, HTTP_HOST, () => {
  console.log(`[bridge] http listening on ${HTTP_HOST}:${PORT}`);
});

httpServer.on('error', (error) => {
  console.error(`[bridge] http server error on ${HTTP_HOST}:${PORT}:`, error.message);
});

process.on('SIGINT', () => {
  stopDiscordHeartbeat();
  stopStoatPing();
  try {
    localWss.close();
  } catch {
    // no-op
  }
  process.exit(0);
});
