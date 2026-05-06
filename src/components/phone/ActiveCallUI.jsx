import React, { useState, useEffect } from 'react';
import { PhoneOff, Mic, MicOff } from 'lucide-react';

export default function ActiveCallUI({ call, currentUser, onHangup, localStream }) {
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = muted; });
    }
    setMuted(m => !m);
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const otherName = call.caller_email === currentUser?.email ? call.callee_name : call.caller_name;
  const otherNumber = call.caller_email === currentUser?.email ? call.callee_number : call.caller_number;

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 p-8">
      {/* Avatar */}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold border-2"
        style={{ borderColor: '#39FF14', background: '#0a1a0a', color: '#39FF14', boxShadow: '0 0 30px #39FF1444' }}
      >
        {(otherName || '?')[0].toUpperCase()}
      </div>

      <div className="text-center space-y-1">
        <p className="text-xl font-bold glow tracking-wider">{otherName}</p>
        <p className="text-xs text-muted-foreground">{otherNumber}</p>
        <p className="text-sm" style={{ color: '#39FF14' }}>{fmt(elapsed)}</p>
      </div>

      <div className="flex gap-4 mt-4">
        <button
          onClick={toggleMute}
          className="flex flex-col items-center gap-1 p-4 rounded-full border border-border hover:bg-secondary transition-colors"
        >
          {muted ? <MicOff className="w-5 h-5 text-destructive" /> : <Mic className="w-5 h-5" />}
          <span className="text-[9px] text-muted-foreground">{muted ? 'UNMUTE' : 'MUTE'}</span>
        </button>

        <button
          onClick={onHangup}
          className="flex flex-col items-center gap-1 p-5 rounded-full transition-colors"
          style={{ background: '#ff3333', color: '#fff' }}
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}