import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, Zap, Shield, Users, MessageCircle, Code, Gamepad2, ArrowRight, Download } from 'lucide-react';

const FEATURES = [
  { icon: MessageCircle, title: 'Real-time Chat', desc: 'Terminal-style or Discord bubble layout. Your choice.' },
  { icon: Code, title: 'Code Rooms', desc: 'Share and discuss code snippets with syntax highlighting.' },
  { icon: Gamepad2, title: 'Built-in Games', desc: 'Play Snake, Tetris, Minesweeper, Minecraft & GBA emulator.' },
  { icon: Users, title: 'Private Servers', desc: 'Create invite-only servers for your team or friends.' },
  { icon: Shield, title: 'Mod Tools', desc: 'Full moderation controls. Kick, ban, promote members.' },
  { icon: Zap, title: 'File Sharing', desc: 'Share images, videos and files directly in chat.' },
];

const RELEASE_REPO = import.meta.env.VITE_RELEASE_REPO || '643-gamedev/Thechatbox';

function pickAsset(assets, { exactNames = [], ext = '' }) {
  const exact = assets.find((asset) => exactNames.includes(asset.name));
  if (exact) return exact;
  if (!ext) return null;
  return assets.find((asset) => asset.name.toLowerCase().endsWith(ext.toLowerCase())) || null;
}

export default function Landing() {
  const [typed, setTyped] = useState('');
  const [releaseState, setReleaseState] = useState({
    loading: true,
    error: '',
    tag: '',
    pageUrl: `https://github.com/${RELEASE_REPO}/releases/latest`,
    assets: [],
  });
  const full = 'THECHATBOX';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) {
      window.location.replace(`/app?invite=${invite}`);
    }
  }, []);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setTyped(full.slice(0, i + 1));
      i += 1;
      if (i >= full.length) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLatestRelease() {
      try {
        setReleaseState((prev) => ({ ...prev, loading: true, error: '' }));
        const url = `https://api.github.com/repos/${RELEASE_REPO}/releases/latest`;
        const res = await fetch(url, {
          headers: {
            Accept: 'application/vnd.github+json',
          },
        });
        if (!res.ok) {
          throw new Error(`GitHub release lookup failed (${res.status})`);
        }
        const payload = await res.json();
        if (cancelled) return;
        setReleaseState({
          loading: false,
          error: '',
          tag: payload.tag_name || '',
          pageUrl: payload.html_url || `https://github.com/${RELEASE_REPO}/releases/latest`,
          assets: Array.isArray(payload.assets) ? payload.assets : [],
        });
      } catch (error) {
        if (cancelled) return;
        setReleaseState((prev) => ({
          ...prev,
          loading: false,
          error: error.message || 'Could not fetch release assets.',
        }));
      }
    }

    loadLatestRelease();
    return () => {
      cancelled = true;
    };
  }, []);

  const downloadTargets = useMemo(() => {
    const assets = releaseState.assets;
    const win = pickAsset(assets, {
      exactNames: ['Thechatbox-Setup.exe', 'Thechatbox.exe'],
      ext: '.exe',
    });
    const deb = pickAsset(assets, {
      exactNames: ['thechatbox.deb', 'Thechatbox.deb'],
      ext: '.deb',
    });
    const apk = pickAsset(assets, {
      exactNames: ['thechatbox.apk', 'app-debug.apk'],
      ext: '.apk',
    });

    return [
      {
        name: 'Windows',
        icon: '🪟',
        ext: '.exe',
        asset: win,
      },
      {
        name: 'Linux',
        icon: '🐧',
        ext: '.deb',
        asset: deb,
      },
      {
        name: 'Android',
        icon: '🤖',
        ext: '.apk',
        asset: apk,
      },
    ];
  }, [releaseState.assets]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="scanlines fixed inset-0 z-50 pointer-events-none" />

      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-bold glow tracking-widest">🦦 THECHATBOX</span>
          <div className="flex items-center gap-4">
            <Link to="/app" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Open App
            </Link>
            <a
              href="#download"
              className="text-xs px-3 py-1.5 rounded border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Downloads
            </a>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6 text-center relative">
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, #39FF1411 0%, transparent 70%)' }}
        />

        <p className="text-[10px] tracking-[0.4em] text-muted-foreground mb-4">// open-source developer chat platform</p>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-widest glow crt-flicker">
          {typed}
          <span className="cursor-blink">_</span>
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
          A hacker-aesthetic chat platform built for developers.
          <br />
          Servers, code rooms, games, file sharing - all in one terminal.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#download"
            className="flex items-center gap-2 px-8 py-3 rounded font-bold text-sm tracking-wider transition-all"
            style={{ background: '#39FF14', color: '#000' }}
          >
            <Download className="w-4 h-4" />
            Download Builds
          </a>
          <Link
            to="/app"
            className="flex items-center gap-2 px-8 py-3 rounded font-bold text-sm tracking-wider border border-border hover:bg-secondary transition-colors"
          >
            <Monitor className="w-4 h-4" />
            Try in Browser
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <p className="text-[9px] text-muted-foreground mt-4">Available for Windows · Linux · Android · Web</p>
      </section>

      <section id="download" className="px-6 pb-20 max-w-5xl mx-auto text-center">
        <p className="text-[10px] tracking-[0.4em] text-muted-foreground mb-4">// downloads</p>
        <h2 className="text-2xl font-bold glow tracking-widest mb-2">LATEST RELEASE ASSETS</h2>
        <p className="text-xs text-muted-foreground mb-6">
          {releaseState.tag ? `Release ${releaseState.tag}` : 'Fetching latest GitHub release...'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {downloadTargets.map((target) => {
            const available = Boolean(target.asset?.browser_download_url);
            return (
              <div key={target.name} className="border border-border rounded p-6 bg-card flex flex-col items-center gap-3">
                <span className="text-3xl">{target.icon}</span>
                <p className="text-sm font-bold tracking-wider">{target.name}</p>
                <p className="text-[10px] text-muted-foreground">{target.ext}</p>

                {available ? (
                  <a
                    href={target.asset.browser_download_url}
                    className="w-full mt-2 py-2 rounded text-xs font-bold text-center transition-colors"
                    style={{ background: '#39FF14', color: '#000' }}
                  >
                    Download {target.ext}
                  </a>
                ) : (
                  <button
                    disabled
                    className="w-full mt-2 py-2 rounded text-xs font-bold border text-center opacity-60"
                    style={{ borderColor: '#39FF1466', color: '#39FF14' }}
                  >
                    Not Uploaded Yet
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {releaseState.error && (
          <p className="text-xs text-destructive mb-3">{releaseState.error}</p>
        )}

        <a
          href={releaseState.pageUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary underline"
        >
          Open full release page
        </a>
      </section>

      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <p className="text-[10px] tracking-[0.4em] text-muted-foreground text-center mb-10">// features</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="border border-border rounded p-5 bg-card hover:bg-secondary transition-colors group">
              <Icon className="w-5 h-5 mb-3 text-muted-foreground group-hover:text-foreground transition-colors" style={{ color: '#39FF1488' }} />
              <h3 className="text-xs font-bold tracking-wider mb-1 glow-subtle">{title}</h3>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center">
        <p className="text-xs font-bold glow-subtle tracking-widest mb-1">🦦 THECHATBOX</p>
        <p className="text-[10px] text-muted-foreground">// built for developers, by developers</p>
      </footer>
    </div>
  );
}
