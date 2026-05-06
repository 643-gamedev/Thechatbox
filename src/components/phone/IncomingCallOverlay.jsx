import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff } from 'lucide-react';

// Simple ringtone using Web Audio API
function useRingtone(active) {
  const ctxRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (ctxRef.current) { ctxRef.current.close(); ctxRef.current = null; }
      return;
    }

    const ring = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ctxRef.current = ctx;
        [0, 0.2].forEach(offset => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 480;
          gain.gain.setValueAtTime(0.3, ctx.currentTime + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.15);
          osc.start(ctx.currentTime + offset);
          osc.stop(ctx.currentTime + offset + 0.15);
        });
      } catch {}
    };

    ring();
    intervalRef.current = setInterval(ring, 2000);
    return () => {
      clearInterval(intervalRef.current);
      if (ctxRef.current) { ctxRef.current.close(); ctxRef.current = null; }
    };
  }, [active]);
}

export default function IncomingCallOverlay({ call, onAccept, onDecline }) {
  useRingtone(!!call);

  if (!call) return null;

  return (
    <div
      className="fixed top-4 left-4 z-[9999] border border-border rounded-lg p-4 shadow-2xl flex flex-col gap-3 min-w-[220px]"
      style={{ background: '#0a1a0a', boxShadow: '0 0 20px #39FF1433' }}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#39FF14' }} />
        <span className="text-[10px] tracking-widest text-muted-foreground">INCOMING CALL</span>
      </div>
      <div>
        <p className="text-sm font-bold glow">{call.caller_name || 'Unknown'}</p>
        <p className="text-[10px] text-muted-foreground">{call.caller_number}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-bold"
          style={{ background: '#39FF14', color: '#000' }}
        >
          <Phone className="w-3.5 h-3.5" /> Accept
        </button>
        <button
          onClick={onDecline}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-bold border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
        >
          <PhoneOff className="w-3.5 h-3.5" /> Decline
        </button>
      </div>
    </div>
  );
}