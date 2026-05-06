import React, { useState, useRef } from 'react';
import { Volume2, Play, Square, Download } from 'lucide-react';
import { playDialupModem, stopDialupModem, playJP3Ringtone, playConnectingRing } from '@/lib/sounds';

export default function SoundFXPanel() {
  const [playing, setPlaying] = useState(null); // which sound id is playing
  const stopFnRef = useRef(null); // stop function for synth sounds

  const stopCurrent = () => {
    if (stopFnRef.current) { stopFnRef.current(); stopFnRef.current = null; }
    stopDialupModem();
    setPlaying(null);
  };

  const handlePlay = (id, fn) => {
    stopCurrent();
    setPlaying(id);
    const result = fn();
    // If fn returns a stop function (JP3, PSTN), store it
    if (typeof result === 'function') {
      stopFnRef.current = result;
    }
    // For dialup: it ends naturally in ~26s
    if (id === 'dialup') {
      // Clear playing indicator when audio ends (approximate)
      const timer = setTimeout(() => { setPlaying(null); }, 27000);
      stopFnRef.current = () => { clearTimeout(timer); stopDialupModem(); };
    }
  };

  const SOUNDS = [
    {
      id: 'dialup',
      label: 'Dialup Modem (login)',
      desc: 'Plays on first app open — 56k connecting sound',
      play: () => { playDialupModem(); },
      url: 'https://www.soundjay.com/communication_c2026/dial-up-modem-01.mp3',
    },
    {
      id: 'jp3',
      label: 'JP3 Satellite Ringtone (incoming call)',
      desc: 'Plays when someone calls you — loops',
      play: () => playJP3Ringtone(),
      url: null,
    },
    {
      id: 'pstn',
      label: 'PSTN Ringback (outgoing call)',
      desc: 'Plays while waiting for answer — loops',
      play: () => playConnectingRing(),
      url: null,
    },
  ];

  return (
    <div className="border border-border rounded p-4 bg-card space-y-3 mb-4">
      <p className="text-[10px] tracking-widest text-muted-foreground flex items-center gap-1">
        <Volume2 className="w-3 h-3" /> SOUND FX
      </p>
      <p className="text-[9px] text-muted-foreground">// preview & download the app's sound effects</p>
      {SOUNDS.map(({ id, label, desc, play, url }) => (
        <div key={id} className="flex items-center gap-2 border border-border rounded px-3 py-2 bg-background">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">{label}</p>
            <p className="text-[9px] text-muted-foreground">{desc}</p>
          </div>
          {/* Play */}
          <button
            onClick={() => handlePlay(id, play)}
            disabled={playing === id}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] border border-border hover:bg-secondary transition-colors flex-shrink-0 disabled:opacity-40"
          >
            <Play className="w-3 h-3" /> Play
          </button>
          {/* Stop */}
          <button
            onClick={stopCurrent}
            disabled={playing !== id}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] border border-border hover:bg-destructive/20 transition-colors flex-shrink-0 disabled:opacity-30"
            style={playing === id ? { borderColor: '#ff4444', color: '#ff4444' } : {}}
          >
            <Square className="w-3 h-3" /> Stop
          </button>
          {/* Download */}
          {url && (
            <a
              href={url}
              download
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] border border-border hover:bg-secondary transition-colors flex-shrink-0"
            >
              <Download className="w-3 h-3" /> DL
            </a>
          )}
        </div>
      ))}
    </div>
  );
}