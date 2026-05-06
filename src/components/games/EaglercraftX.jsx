import React, { useRef, useState } from 'react';

// Multiple mirrors — try in order
const MIRRORS = [
  'https://eaglercraft.dev/clients/Release%201.8.8%20WASM/index.html',
];

export default function EaglercraftX({ active }) {
  const [mirrorIdx, setMirrorIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef(null);

  if (!active) return null;

  const src = MIRRORS[mirrorIdx];

  const tryNext = () => {
    if (mirrorIdx < MIRRORS.length - 1) {
      setMirrorIdx(i => i + 1);
      setLoaded(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative" style={{ minHeight: 500 }}>
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background z-10">
          <div className="text-2xl">⛏️</div>
          <p className="text-xs glow tracking-widest">LOADING EAGLERCRAFT 1.8.8</p>
          <p className="text-[10px] text-muted-foreground">// booting minecraft client<span className="cursor-blink">_</span></p>
          <p className="text-[9px] text-muted-foreground opacity-60">mirror {mirrorIdx + 1}/{MIRRORS.length}</p>
          {mirrorIdx < MIRRORS.length - 1 && (
            <button
              onClick={tryNext}
              className="mt-2 text-[10px] border border-border px-3 py-1 rounded hover:bg-secondary transition-colors"
            >
              Try next mirror →
            </button>
          )}
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={src}
        key={src}
        className="w-full flex-1"
        style={{ border: 'none', minHeight: 500 }}
        allow="fullscreen; pointer-lock"
        sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-popups"
        title="EaglercraftX 1.8.8"
        onLoad={() => setLoaded(true)}
        onError={tryNext}
      />
      <div className="text-[9px] text-muted-foreground px-2 py-1 border-t border-border flex items-center justify-between">
        <span>EaglercraftX 1.8.8 — WebGL client. Click to capture mouse. Esc to release.</span>
        {mirrorIdx < MIRRORS.length - 1 && loaded && (
          <button onClick={() => { setMirrorIdx(i => i + 1); setLoaded(false); }} className="text-[9px] underline opacity-60 hover:opacity-100">
            gray screen? try next mirror
          </button>
        )}
      </div>
    </div>
  );
}