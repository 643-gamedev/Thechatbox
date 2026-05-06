
import React, { useEffect, useState } from 'react';
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

const PLATFORMS = [
  { name: 'iOS', icon: '', ext: 'PWA · Add to Home Screen', pwa: true, iosInstall: true },
  { name: 'Android', icon: '🤖', ext: 'PWA · Add to Home Screen', pwa: true, androidInstall: true },
  { name: 'Desktop', icon: '💻', ext: 'Open in browser', pwa: true, web: true },
];

export default function Landing() {
  const [typed, setTyped] = useState('');
  const full = 'THECHATBOX';

  // Redirect invite links to /app, redirect non-download visits to /app too
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    const isDownload = params.has('download');

    if (invite) {
      window.location.replace('/app?invite=' + invite);
      return;
    }
    // Only show landing page if ?download is explicitly in the URL
    if (!isDownload && window.location.pathname === '/') {
      // Allow the landing page to show normally — don't redirect
    }
  }, []);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setTyped(full.slice(0, i + 1));
      i++;
      if (i >= full.length) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  const handleDownload = () => {
    const content = `THECHATBOX — Desktop App
========================

The desktop app hasn't been released yet!

In the meantime, you can use the web app at:
https://thechatbox.db.app

Stay tuned for the official desktop release for Windows, macOS, and Linux.

// built for developers, by developers 🦦`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'THECHATBOX_NOT_RELEASED_YET.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Scanlines overlay */}
      <div className="scanlines fixed inset-0 z-50 pointer-events-none" />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-bold glow tracking-widest">🦦 THECHATBOX</span>
          <div className="flex items-center gap-4">
            <Link to="/app" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Open App</Link>
            <a
              href="#download"
              className="text-xs px-3 py-1.5 rounded border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Download
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 text-center relative">
        {/* Glow blob */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, #39FF1411 0%, transparent 70%)' }} />

        <p className="text-[10px] tracking-[0.4em] text-muted-foreground mb-4">// open-source developer chat platform</p>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-widest glow crt-flicker">
          {typed}<span className="cursor-blink">_</span>
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
          A hacker-aesthetic chat platform built for developers.<br />
          Servers, code rooms, games, file sharing — all in one terminal.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-8 py-3 rounded font-bold text-sm tracking-wider transition-all"
            style={{ background: '#39FF14', color: '#000' }}
          >
            <Download className="w-4 h-4" />
            Download App
          </button>
          <Link
            to="/app"
            className="flex items-center gap-2 px-8 py-3 rounded font-bold text-sm tracking-wider border border-border hover:bg-secondary transition-colors"
          >
            <Monitor className="w-4 h-4" />
            Try in Browser
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <p className="text-[9px] text-muted-foreground mt-4">
          Available for Windows · macOS · Linux · Web
        </p>
      </section>

      {/* Preview mockup */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div className="rounded-lg border border-border overflow-hidden shadow-2xl"
          style={{ boxShadow: '0 0 60px #39FF1422' }}>
          <div className="h-8 bg-card border-b border-border flex items-center gap-2 px-4">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive opacity-60" />
            <div className="w-2.5 h-2.5 rounded-full opacity-40" style={{ background: '#fbbf24' }} />
            <div className="w-2.5 h-2.5 rounded-full opacity-60" style={{ background: '#39FF14' }} />
            <span className="text-[10px] text-muted-foreground ml-2">thechatbox.db.app</span>
          </div>
          <div className="bg-card p-6 min-h-48 flex items-center justify-center">
            <div className="text-center space-y-3 w-full max-w-md">
              <div className="space-y-1 text-left font-mono text-xs">
                <p><span style={{ color: '#39FF14' }}>[hacker42]</span><span className="text-muted-foreground mx-1">$</span>yo anyone here?</p>
                <p><span style={{ color: '#39FF14' }}>[devgirl]</span><span className="text-muted-foreground mx-1">$</span>yeah, what's up</p>
                <p><span style={{ color: '#39FF14' }}>[hacker42]</span><span className="text-muted-foreground mx-1">$</span>check this snippet</p>
                <div className="border border-border rounded p-2 bg-background mt-1">
                  <p className="text-[10px] text-muted-foreground">python</p>
                  <pre className="text-xs" style={{ color: '#39FF14' }}>{`def hello():\n    print("THECHATBOX")`}</pre>
                </div>
                <p><span style={{ color: '#39FF14' }}>[devgirl]</span><span className="text-muted-foreground mx-1">$</span>clean 🔥</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
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

      {/* Download */}
      <section id="download" className="px-6 pb-20 max-w-4xl mx-auto text-center">
        <p className="text-[10px] tracking-[0.4em] text-muted-foreground mb-4">// download</p>
        <h2 className="text-2xl font-bold glow tracking-widest mb-2">GET THE APP</h2>
        <p className="text-xs text-muted-foreground mb-10">Native desktop app — no browser required</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {PLATFORMS.map(p => (
            <div key={p.name} className="border border-border rounded p-6 bg-card flex flex-col items-center gap-3">
              <span className="text-3xl">{p.icon}</span>
              <p className="text-sm font-bold tracking-wider">{p.name}</p>
              <p className="text-[10px] text-muted-foreground">{p.ext}</p>
              {p.iosInstall && (
                <div className="w-full text-[9px] text-muted-foreground border border-border rounded p-2 text-left space-y-1">
                  <p className="font-bold" style={{ color: '#39FF14' }}>How to install:</p>
                  <p>1. Open in <span className="text-foreground">Safari</span></p>
                  <p>2. Tap <span className="text-foreground">Share</span> → "Add to Home Screen"</p>
                  <p>3. Tap <span className="text-foreground">Add</span> ✓</p>
                </div>
              )}
              {p.androidInstall && (
                <div className="w-full text-[9px] text-muted-foreground border border-border rounded p-2 text-left space-y-1">
                  <p className="font-bold" style={{ color: '#39FF14' }}>How to install:</p>
                  <p>1. Open in <span className="text-foreground">Chrome</span></p>
                  <p>2. Tap <span className="text-foreground">⋮ Menu</span> → "Add to Home screen"</p>
                  <p>3. Tap <span className="text-foreground">Add</span> ✓</p>
                </div>
              )}
              {p.web ? (
                <Link
                  to="/app"
                  className="w-full mt-2 py-2 rounded text-xs font-bold text-center transition-colors"
                  style={{ background: '#39FF14', color: '#000' }}
                >
                  Open Web App
                </Link>
              ) : (
                <Link
                  to="/app"
                  className="w-full mt-2 py-2 rounded text-xs font-bold border text-center transition-colors hover:bg-secondary"
                  style={{ borderColor: '#39FF1466', color: '#39FF14' }}
                >
                  Open & Install →
                </Link>
              )}
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground">
          No app store needed — install directly from your browser as a PWA
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center">
        <p className="text-xs font-bold glow-subtle tracking-widest mb-1">🦦 THECHATBOX</p>
        <p className="text-[10px] text-muted-foreground">// built for developers, by developers</p>
      </footer>
    </div>
  );
}