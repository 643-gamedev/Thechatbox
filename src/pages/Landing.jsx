import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, ArrowRight, Monitor } from 'lucide-react';

const RELEASE_BASE = 'https://github.com/643-gamedev/thechatbox/releases/latest/download';

const DOWNLOADS = [
  {
    name: 'Windows (.exe)',
    filename: 'Thechatbox-Setup.exe',
    note: 'Desktop installer',
  },
  {
    name: 'macOS (.dmg)',
    filename: 'Thechatbox.dmg',
    note: 'Intel + Apple Silicon',
  },
  {
    name: 'Linux (.deb)',
    filename: 'thechatbox.deb',
    note: 'Debian/Ubuntu package',
  },
  {
    name: 'Android (.apk)',
    filename: 'thechatbox.apk',
    note: 'Direct sideload package',
  },
];

export default function Landing() {
  const [typed, setTyped] = useState('');
  const full = 'THECHATBOX DOWNLOADS';

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setTyped(full.slice(0, i + 1));
      i += 1;
      if (i >= full.length) clearInterval(interval);
    }, 55);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="scanlines fixed inset-0 z-50 pointer-events-none" />

      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-bold glow tracking-widest">🦦 THECHATBOX</span>
          <div className="flex items-center gap-4">
            <a href="#downloads" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Download
            </a>
            <Link to="/app" className="text-xs px-3 py-1.5 rounded border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
              Open Web App
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-16 px-6 text-center relative">
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, #39FF1412 0%, transparent 68%)' }}
        />

        <p className="text-[10px] tracking-[0.4em] text-muted-foreground mb-4">// free and open-source</p>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-widest glow crt-flicker">
          {typed}
          <span className="cursor-blink">_</span>
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
          Self-hostable chat for developers. Download native apps or run the web app.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#downloads"
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
            Open Browser App
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      <section id="downloads" className="px-6 pb-20 max-w-5xl mx-auto">
        <p className="text-[10px] tracking-[0.4em] text-muted-foreground text-center mb-8">// release artifacts</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DOWNLOADS.map((item) => (
            <a
              key={item.filename}
              href={`${RELEASE_BASE}/${item.filename}`}
              className="border border-border rounded p-5 bg-card hover:bg-secondary transition-colors flex items-center justify-between gap-4"
              target="_blank"
              rel="noreferrer"
            >
              <div>
                <p className="text-sm font-bold tracking-wider glow-subtle">{item.name}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{item.note}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{item.filename}</p>
              </div>
              <span className="text-xs px-3 py-1 rounded border border-primary text-primary">Download</span>
            </a>
          ))}
        </div>

        <div className="mt-8 border border-border rounded p-4 bg-card">
          <p className="text-xs text-muted-foreground">No installer yet?</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Artifacts are published automatically from GitHub Actions when a release is created.
          </p>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center">
        <p className="text-xs font-bold glow-subtle tracking-widest mb-1">🦦 THECHATBOX</p>
        <p className="text-[10px] text-muted-foreground">MIT License · Public source code</p>
      </footer>
    </div>
  );
}
