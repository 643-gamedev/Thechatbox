
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { Mic, MicOff, PhoneOff, Loader2, Volume2 } from 'lucide-react';

function loadPeerJS() {
  return new Promise((resolve) => {
    if (window.Peer) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Presence key for DM calls: dm:emailA:emailB (sorted)
function dmKey(a, b) { return `dm:${[a, b].sort().join(':')}` }

export default function DMCallOverlay({ myEmail, myName, peerEmail, peerName, onClose }) {
  const [phase, setPhase] = useState('connecting'); // connecting | active
  const [micEnabled, setMicEnabled] = useState(true);
  const [peerStream, setPeerStream] = useState(null);
  const [error, setError] = useState('');

  const peerRef = useRef(null);
  const myStreamRef = useRef(null);
  const presenceRecordId = useRef(null);
  const myPeerIdRef = useRef(null);
  const callRef = useRef(null);
  const peerAudioRef = useRef(null);

  const key = dmKey(myEmail, peerEmail);

  useEffect(() => {
    if (peerAudioRef.current && peerStream) {
      peerAudioRef.current.srcObject = peerStream;
    }
  }, [peerStream]);

  const cleanup = useCallback(async () => {
    if (presenceRecordId.current) {
      db.entities.GuestSession.delete(presenceRecordId.current).catch(() => {});
      presenceRecordId.current = null;
    }
    if (myStreamRef.current) { myStreamRef.current.getTracks().forEach(t => t.stop()); myStreamRef.current = null; }
    if (callRef.current) { try { callRef.current.close(); } catch {} callRef.current = null; }
    if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null; }
    setPeerStream(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      await loadPeerJS();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
      myStreamRef.current = stream;

      const peer = new window.Peer(undefined, { config: { iceServers: ICE_SERVERS }, debug: 0 });
      peerRef.current = peer;

      peer.on('open', async (myId) => {
        if (cancelled) return;
        myPeerIdRef.current = myId;

        // Clean stale presence
        const stale = await db.entities.GuestSession.filter({ guest_id: key, display_name: myEmail });
        await Promise.all(stale.map(r => db.entities.GuestSession.delete(r.id).catch(() => {})));

        // Register presence
        const rec = await db.entities.GuestSession.create({ guest_id: key, display_name: myEmail, session_token: myId });
        presenceRecordId.current = rec.id;

        // Check if peer is already in call
        const existing = await db.entities.GuestSession.filter({ guest_id: key });
        const them = existing.find(r => r.display_name === peerEmail && r.id !== rec.id);
        if (them?.session_token) {
          // We call them
          const call = peerRef.current.call(them.session_token, stream, { metadata: { name: myName } });
          callRef.current = call;
          call.on('stream', s => { if (!cancelled) { setPeerStream(s); setPhase('active'); } });
          call.on('close', () => { if (!cancelled) onClose(); });
          call.on('error', () => {});
        }

        // Subscribe: if they join after us, they'll call us
        db.entities.GuestSession.subscribe((event) => {
          if (cancelled) return;
          if (event.type !== 'create') return;
          const d = event.data;
          if (!d || d.guest_id !== key) return;
          if (d.id === presenceRecordId.current) return;
          if (d.session_token === myPeerIdRef.current) return;
          // They called us via peer.on('call') below
        });
      });

      peer.on('call', (call) => {
        if (cancelled) return;
        call.answer(myStreamRef.current);
        callRef.current = call;
        call.on('stream', s => { if (!cancelled) { setPeerStream(s); setPhase('active'); } });
        call.on('close', () => { if (!cancelled) onClose(); });
        call.on('error', () => {});
      });

      peer.on('error', (err) => {
        if (err.type === 'peer-unavailable' || err.type === 'webrtc') return;
        if (!cancelled) setError(err.type || err.message);
      });
    };

    start().catch(e => { if (!cancelled) setError(e.message || 'Mic access denied'); });

    return () => { cancelled = true; cleanup(); };
  }, []); // eslint-disable-line

  const toggleMic = () => {
    if (!myStreamRef.current) return;
    const next = !micEnabled;
    myStreamRef.current.getAudioTracks().forEach(t => { t.enabled = next; });
    setMicEnabled(next);
  };

  const hangUp = () => { cleanup(); onClose(); };

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-6">
      <audio ref={peerAudioRef} autoPlay playsInline />

      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full border-2 border-primary flex items-center justify-center text-2xl font-bold glow-subtle">
          {peerName[0]?.toUpperCase()}
        </div>
        <p className="text-sm font-bold glow">{peerName}</p>
        {phase === 'connecting' && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>calling<span className="cursor-blink">_</span></span>
          </div>
        )}
        {phase === 'active' && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#39FF14' }}>
            <Volume2 className="w-3 h-3 animate-pulse" />
            <span>connected</span>
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleMic}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded border transition-colors ${micEnabled ? 'bg-secondary border-border' : 'bg-destructive/10 border-destructive/30'}`}
        >
          {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-destructive" />}
          <span className="text-[9px] text-muted-foreground">{micEnabled ? 'Mute' : 'Unmute'}</span>
        </button>
        <button
          onClick={hangUp}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded border bg-destructive/20 hover:bg-destructive/40 border-destructive/40"
        >
          <PhoneOff className="w-5 h-5 text-destructive" />
          <span className="text-[9px] text-destructive">End Call</span>
        </button>
      </div>
    </div>
  );
}