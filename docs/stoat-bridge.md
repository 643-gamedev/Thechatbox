# Stoat Bridge Design

This bridge enables cross-platform messaging between Thechatbox and Stoat.

## Goals

- If a user chats in Thechatbox, that message appears in Stoat.
- If a user chats in Stoat, that message appears in Thechatbox.
- Each Thechatbox user is represented in Stoat by a bot identity that mirrors their display name.
- Servers/channels can be synced to Stoat.

## Components

- Thechatbox frontend writes chat messages to Supabase table `messages`.
- Stoat bridge service subscribes to Supabase realtime insert events.
- Bridge calls Stoat API endpoints:
  - `POST /bots/upsert` to create/update mirror bot identities.
  - `POST /bridge/messages` to publish mirrored messages into Stoat.
- Stoat sends inbound webhook events to `POST /stoat/inbound`.
- Bridge writes inbound Stoat messages into Supabase with `bridge_source='stoat'`.

## Loop Prevention

- Outbound mirror ignores rows with `bridge_source='stoat'`.
- Inbound Stoat webhook inserts rows with `bridge_source='stoat'`.

## Required Environment

`services/stoat-bridge/.env`

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STOAT_API_BASE`
- `STOAT_API_TOKEN`
- `STOAT_SHARED_SECRET` (recommended)

## Manual Sync Endpoint

`POST /sync/server/:serverId`

Use this when you want to push current server/channel metadata to Stoat.

## User Bot Provisioning Endpoint

`POST /sync/user`

The frontend can call this when a user signs up/signs in so their Stoat mirror bot exists before first message.

## Production Notes

- Replace the placeholder Stoat endpoints if your Stoat deployment uses different routes.
- Restrict webhook IPs and always enforce shared-secret auth.
- Add retry queue/backoff for delivery guarantees.
- Add persistent id-mapping tables if you need strict channel/thread parity.
