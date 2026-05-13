# Thechatbox

Self-hostable developer chat platform with web, desktop, and Android builds.

## Stack

- Frontend: React + Vite + Tailwind
- Database/Auth/Storage/Realtime: Supabase (free tier compatible)
- Hosting: Cloudflare Pages (free tier compatible)
- Desktop apps: Electron + electron-builder (`.exe`, `.dmg`, `.deb`)
- Android app: Capacitor (`.apk`)
- Stoat federation bridge: `services/stoat-bridge` (open-source Node service)

## Quick Start

1. Install dependencies:

```bash
npm install
npm --prefix services/stoat-bridge install
```

2. Create `.env` in project root:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_SUPABASE_STORAGE_BUCKET=uploads

# Optional: endpoint for the code-run simulator button in Code Editor
VITE_LLM_PROXY_URL=

# Optional: Stoat bridge / discover API
VITE_STOAT_BRIDGE_URL=
VITE_STOAT_BRIDGE_SHARED_SECRET=
```

3. Create Supabase schema:

- Open Supabase SQL Editor.
- Run [`supabase/schema.sql`](supabase/schema.sql).
- In Supabase Storage, create a public bucket named `uploads`.

4. Run the app:

```bash
npm run dev
```

## Cloudflare Pages Deploy (Free)

1. Push this repository to GitHub.
2. In Cloudflare Dashboard, go to `Workers & Pages` -> `Create` -> `Pages` -> `Connect to Git`.
3. Build settings:
- Build command: `npm run build`
- Publish directory: `dist`
4. Add env vars in Cloudflare Pages:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_STORAGE_BUCKET`
- `VITE_STOAT_BRIDGE_URL` (optional)

## GitHub Repo Setup (`643-gamedev`)

When your token is ready:

```bash
git init
git checkout -b main
git add .
git commit -m "Initial open-source Thechatbox migration"
git remote add origin https://github.com/643-gamedev/thechatbox.git
git push -u origin main
```

## Base44 Re-import Automation

When you export a new ZIP from Base44, use the automation tool:

```bash
node tools/base44-sync.mjs --zip /path/to/Thechatbox.zip
```

What it does:
- Imports updated app files (`src`, `public`, `entities`, and related config files)
- Removes injected Base44 runtime lines and renames legacy import paths
- Scans for remaining Base44 traces

Optional commit and push:

```bash
node tools/base44-sync.mjs \
  --zip /path/to/Thechatbox.zip \
  --commit \
  --push \
  --branch main \
  --message "sync: latest Base44 export"
```

## Desktop Builds

```bash
npm run desktop:build
```

Artifacts will be generated in `releases/`:
- Windows: `.exe`
- macOS: `.dmg`
- Linux: `.deb`

## Android APK Build

```bash
npm run android:init     # first time only
npm run android:apk
```

APK output path:
- `android/app/build/outputs/apk/debug/app-debug.apk`

## Stoat Cross-Platform Bridge

Bridge service location:
- [`services/stoat-bridge`](services/stoat-bridge)

What it does:
- Runs a **local WebSocket server** on `ws://127.0.0.1:8080` for custom UI clients.
- Uses `channel-map.json` to map `local-channel-id` to Discord and Stoat channel IDs.
- Relays local outbound messages to Discord webhooks (spoofed username/avatar) and Stoat bot API.
- Listens to Discord and Stoat gateway events and broadcasts standardized inbound packets to local clients.
- Exposes `/discover/servers?source=discord|stoat` and filters out NSFW listings.

Setup:

```bash
cp services/stoat-bridge/.env.example services/stoat-bridge/.env
npm run bridge:dev
```

You must configure Discord and Stoat bot tokens and update:
- `services/stoat-bridge/channel-map.json`
- `services/stoat-bridge/discover-servers.json`

## Downloads Page

`/` is the download landing page and links to GitHub release artifacts:

- `Thechatbox-Setup.exe`
- `Thechatbox.dmg`
- `thechatbox.deb`
- `thechatbox.apk`

These filenames are expected in each GitHub release.

## License

MIT
