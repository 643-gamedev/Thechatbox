import React, { useState, useRef, useEffect } from 'react';
import { Upload, Gamepad2 } from 'lucide-react';

export default function GBAEmulator() {
  const [romUrl, setRomUrl] = useState(null);
  const [romName, setRomName] = useState('');
  const [blobUrl, setBlobUrl] = useState(null);
  const fileRef = useRef();

  // Build the emulator HTML as a blob so the iframe can access local object URLs
  useEffect(() => {
    if (!romUrl) return;

    const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 100%; height: 100%; background: #000; overflow: hidden; }
    #game { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div style="width:100%;height:100vh;">
    <div id="game"></div>
  </div>
  <script>
    EJS_player = "#game";
    EJS_core = "gba";
    EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
    EJS_gameUrl = "${romUrl}";
    EJS_gameName = "${romName}";
    EJS_color = "#39FF14";
    EJS_startOnLoaded = true;
    EJS_fullscreenOnLoaded = false;
  <\/script>
  <script src="https://cdn.emulatorjs.org/stable/data/loader.js"><\/script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setBlobUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });

    return () => URL.revokeObjectURL(url);
  }, [romUrl, romName]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (romUrl) URL.revokeObjectURL(romUrl);
    setRomUrl(url);
    setRomName(file.name.replace(/\.[^.]+$/, ''));
  };

  if (!blobUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-6">
        <div className="text-center space-y-2">
          <Gamepad2 className="w-10 h-10 mx-auto text-muted-foreground" />
          <h2 className="text-sm font-bold glow tracking-widest">GBA EMULATOR</h2>
          <p className="text-[10px] text-muted-foreground">// powered by EmulatorJS · load a .gba ROM to play</p>
        </div>
        <div
          className="border-2 border-dashed rounded p-8 text-center cursor-pointer hover:bg-secondary transition-colors max-w-xs w-full"
          style={{ borderColor: '#39FF1444' }}
          onClick={() => fileRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) {
              const url = URL.createObjectURL(file);
              setRomUrl(url);
              setRomName(file.name.replace(/\.[^.]+$/, ''));
            }
          }}
        >
          <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Click or drag & drop a <span style={{ color: '#39FF14' }}>.gba</span> ROM file</p>
          <p className="text-[9px] text-muted-foreground mt-1">Your file never leaves your device</p>
        </div>
        <input ref={fileRef} type="file" accept=".gba,.gb,.gbc" className="hidden" onChange={handleFile} />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-4 py-1.5 border-b border-border bg-card flex-shrink-0 flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          // playing: <span style={{ color: '#39FF14' }}>{romName}</span>
        </p>
        <button
          onClick={() => { setRomUrl(null); setRomName(''); setBlobUrl(null); }}
          className="text-[10px] text-muted-foreground hover:text-foreground border border-border px-2 py-0.5 rounded"
        >
          load different ROM
        </button>
      </div>
      <iframe
        key={blobUrl}
        src={blobUrl}
        className="flex-1 w-full border-0"
        title="GBA Emulator"
        allow="autoplay; fullscreen"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
