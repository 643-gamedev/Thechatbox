
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Mic, MicOff, PhoneOff, Monitor, MonitorOff, Video, VideoOff, Users, Loader2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/lib/UserContext';
import { playJoinSound, playLeaveSound, playUserJoinedSound, playUserLeftSound } from '@/lib/sounds';

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
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

export default function VoiceChannel() {
  const { serverId, channelId } = useParams();
  const { currentUser, isGuest } = useUser();
  const queryClient = useQueryClient();

  const { data: channels = [] } = useQuery({
    queryKey: ['channels', serverId || 'main'],
    queryFn: () => db.entities.Channel.filter({ server_id: serverId || 'main' }),
  });
  const channel = channels.find(c => c.id === channelId);

  const displayName = isGuest
    ? (currentUser?.display_name || 'Guest')
    : (currentUser?.full_name || currentUser?.email?.split('@')[0] || 'User');

  const [phase, setPhase] = useState('lobby');
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [error, setError] = useState('');
  const [peers, setPeers] = useState([]);
  const [myStream, setMyStream] = useState(null);
  const [myPeerId, setMyPeerId] = useState(null);

  const peerRef = useRef(null);
  const myStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const callsRef = useRef({});
  const presenceRecordId = useRef(null);
  const myPeerIdRef = useRef(null); // stable ref so subscribe closure always has latest myId

  const cleanup = useCallback(async () => {
    // Remove our presence record
    if (presenceRecordId.current) {
      db.entities.GuestSession.delete(presenceRecordId.current).catch(() => {});
      presenceRecordId.current = null;
    }
    if (myStreamRef.current) {
      myStreamRef.current.getTracks().forEach(t => t.stop());
      myStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    Object.values(callsRef.current).forEach(c => { try { c.close(); } catch {} });
    callsRef.current = {};
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setPeers([]);
    setMyStream(null);
    setMyPeerId(null);
    setScreenSharing(false);
  }, []);

  useEffect(() => () => { cleanup(); }, [cleanup]);

  const addPeerStream = (id, name, stream) => {
    setPeers(prev => {
      const existing = prev.find(p => p.id === id);
      if (existing) return prev.map(p => p.id === id ? { ...p, stream } : p);
      playUserJoinedSound();
      return [...prev, { id, name, stream }];
    });
  };

  const removePeer = (id) => {
    setPeers(prev => {
      if (prev.find(p => p.id === id)) playUserLeftSound();
      return prev.filter(p => p.id !== id);
    });
    delete callsRef.current[id];
  };

  const callPeer = useCallback((remotePeerId, remoteName, stream) => {
    if (!peerRef.current) return;
    if (callsRef.current[remotePeerId]) return;
    const s = stream || myStreamRef.current;
    if (!s) return;
    const call = peerRef.current.call(remotePeerId, s, { metadata: { name: displayName } });
    callsRef.current[remotePeerId] = call;
    call.on('stream', remoteStream => addPeerStream(remotePeerId, remoteName, remoteStream));
    call.on('close', () => removePeer(remotePeerId));
    call.on('error', () => removePeer(remotePeerId));
  }, [displayName]);

  const joinRoom = async () => {
    setPhase('connecting');
    setError('');
    try {
      await loadPeerJS();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: camEnabled });
      myStreamRef.current = stream;
      setMyStream(stream);
      if (!micEnabled) stream.getAudioTracks().forEach(t => { t.enabled = false; });

      const peer = new window.Peer(undefined, {
        config: { iceServers: ICE_SERVERS },
        debug: 0,
      });
      peerRef.current = peer;

      peer.on('open', async (myId) => {
        myPeerIdRef.current = myId;
        setMyPeerId(myId);
        setPhase('room');
        playJoinSound();

        // Clean up ALL stale presence records for this user+channel
        const stale = await db.entities.GuestSession.filter({ guest_id: `vc:${channelId}`, display_name: displayName });
        await Promise.all(stale.map(row => db.entities.GuestSession.delete(row.id).catch(() => {})));

        // Write our fresh presence
        const record = await db.entities.GuestSession.create({
          guest_id: `vc:${channelId}`,
          display_name: displayName,
          session_token: myId,
        });
        presenceRecordId.current = record.id;

        // Call all existing peers in this channel (exclude our own record)
        const existing = await db.entities.GuestSession.filter({ guest_id: `vc:${channelId}` });
        existing.forEach(row => {
          if (row.id !== record.id && row.session_token && row.session_token !== myId) {
            callPeer(row.session_token, row.display_name, stream);
          }
        });

        // Subscribe to new peers joining — use ref so closure always has current myId
        db.entities.GuestSession.subscribe((event) => {
          if (event.type !== 'create') return;
          const d = event.data;
          if (!d || d.guest_id !== `vc:${channelId}`) return;
          // Ignore our own record by both id AND session_token
          if (d.id === presenceRecordId.current) return;
          if (d.session_token === myPeerIdRef.current) return;
          if (!d.session_token || callsRef.current[d.session_token]) return;
          callPeer(d.session_token, d.display_name, myStreamRef.current);
        });
      });

      // Answer incoming calls
      peer.on('call', (call) => {
        call.answer(myStreamRef.current);
        const remoteName = call.metadata?.name || 'User';
        call.on('stream', s => addPeerStream(call.peer, remoteName, s));
        call.on('close', () => removePeer(call.peer));
        call.on('error', () => removePeer(call.peer));
        callsRef.current[call.peer] = call;
      });

      peer.on('error', (err) => {
        // peer-unavailable = remote already gone, webrtc = failed ICE (non-fatal for solo rejoin)
        if (err.type === 'peer-unavailable' || err.type === 'webrtc') return;
        setError(`Connection error: ${err.type || err.message}`);
      });

    } catch (e) {
      setError(e.message || 'Failed to access microphone');
      setPhase('lobby');
    }
  };

  const leaveRoom = () => {
    playLeaveSound();
    cleanup();
    setPhase('lobby');
  };

  const toggleMic = () => {
    if (!myStreamRef.current) return;
    const next = !micEnabled;
    myStreamRef.current.getAudioTracks().forEach(t => { t.enabled = next; });
    setMicEnabled(next);
  };

  const toggleCam = async () => {
    if (!myStreamRef.current) return;
    const videoTracks = myStreamRef.current.getVideoTracks();
    if (camEnabled) {
      videoTracks.forEach(t => { t.enabled = false; });
      setCamEnabled(false);
    } else {
      if (videoTracks.length > 0) {
        videoTracks.forEach(t => { t.enabled = true; });
        setCamEnabled(true);
      } else {
        try {
          const vs = await navigator.mediaDevices.getUserMedia({ video: true });
          const vt = vs.getVideoTracks()[0];
          myStreamRef.current.addTrack(vt);
          Object.values(callsRef.current).forEach(call => {
            const sender = call.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(vt);
          });
          setMyStream(new MediaStream(myStreamRef.current.getTracks()));
          setCamEnabled(true);
        } catch { setError('Camera access denied'); }
      }
    }
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setScreenSharing(false);
    } else {
      try {
        const ss = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = ss;
        const screenTrack = ss.getVideoTracks()[0];
        Object.values(callsRef.current).forEach(call => {
          const sender = call.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });
        setMyStream(new MediaStream([...myStreamRef.current.getAudioTracks(), screenTrack]));
        setScreenSharing(true);
        screenTrack.onended = () => toggleScreenShare();
      } catch (e) {
        if (e.name !== 'NotAllowedError') setError('Screen share failed');
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center px-4 gap-2 bg-card flex-shrink-0">
        <Mic className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-bold glow-subtle">{channel?.name || 'Voice Channel'}</span>
        {channel?.description && (
          <>
            <span className="text-muted-foreground text-xs">|</span>
            <span className="text-xs text-muted-foreground truncate">{channel.description}</span>
          </>
        )}
        {phase === 'room' && (
          <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" /> {peers.length + 1} connected
          </span>
        )}
      </div>

      {/* Lobby */}
      {phase === 'lobby' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-center space-y-5 max-w-sm w-full">
            <div className="space-y-2">
              <div className="text-4xl">🎙️</div>
              <h2 className="text-sm font-bold glow tracking-widest">#{channel?.name || 'voice'}</h2>
              <p className="text-[10px] text-muted-foreground">// P2P voice channel — WebRTC powered</p>
            </div>
            <div className="border border-border rounded p-4 bg-card space-y-3 text-left">
              <p className="text-[10px] tracking-widest text-muted-foreground">JOIN OPTIONS</p>
              <label className="flex items-center gap-3 cursor-pointer" onClick={() => setMicEnabled(v => !v)}>
                <div className={`w-8 h-4 rounded-full transition-colors relative ${micEnabled ? 'bg-primary' : 'bg-muted'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${micEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs">Enable microphone</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer" onClick={() => setCamEnabled(v => !v)}>
                <div className={`w-8 h-4 rounded-full transition-colors relative ${camEnabled ? 'bg-primary' : 'bg-muted'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${camEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs">Enable camera</span>
              </label>
              <p className="text-[10px] text-muted-foreground">Joining as: <span style={{ color: '#39FF14' }}>{displayName}</span></p>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button className="w-full text-xs" onClick={joinRoom}>
              <Mic className="w-3 h-3 mr-2" />$ join --voice
            </Button>
          </div>
        </div>
      )}

      {/* Connecting */}
      {phase === 'connecting' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: '#39FF14' }} />
            <p className="text-xs text-muted-foreground">establishing connection<span className="cursor-blink">_</span></p>
          </div>
        </div>
      )}

      {/* Room */}
      {phase === 'room' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <div className={`grid gap-3 ${peers.length === 0 ? 'grid-cols-1' : peers.length === 1 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`} style={{ minHeight: 200 }}>
              <VideoTile stream={myStream} name={`${displayName} (you)`} muted micEnabled={micEnabled} videoEnabled={camEnabled || screenSharing} isScreen={screenSharing} />
              {peers.map(p => (
                <VideoTile key={p.id} stream={p.stream} name={p.name} muted={false} micEnabled videoEnabled />
              ))}
            </div>
            {peers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-2 opacity-50">
                <Users className="w-6 h-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Waiting for others to join...</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="h-16 border-t border-border bg-card flex items-center justify-center gap-3 px-4 flex-shrink-0">
            <ControlBtn active={micEnabled} onClick={toggleMic} icon={micEnabled ? Mic : MicOff} label={micEnabled ? 'Mute' : 'Unmute'} danger={!micEnabled} />
            <ControlBtn active={camEnabled} onClick={toggleCam} icon={camEnabled ? Video : VideoOff} label={camEnabled ? 'Stop Cam' : 'Camera'} />
            <ControlBtn active={screenSharing} onClick={toggleScreenShare} icon={screenSharing ? MonitorOff : Monitor} label={screenSharing ? 'Stop Share' : 'Screen'} highlight={screenSharing} />
            <button onClick={leaveRoom} className="flex flex-col items-center gap-1 px-3 py-2 rounded border bg-destructive/20 hover:bg-destructive/40 border-destructive/40">
              <PhoneOff className="w-4 h-4 text-destructive" />
              <span className="text-[9px] text-destructive">Leave</span>
            </button>
          </div>
          {error && <div className="px-4 py-1 bg-destructive/10 border-t border-destructive/30"><p className="text-[10px] text-destructive">{error}</p></div>}
        </div>
      )}
    </div>
  );
}

function VideoTile({ stream, name, muted, micEnabled, videoEnabled, isScreen }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  const hasVideo = stream && videoEnabled;

  return (
    <div className="relative rounded border border-border bg-card overflow-hidden flex items-center justify-center" style={{ minHeight: 160 }}>
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-lg font-bold glow-subtle">
            {(name || '?')[0].toUpperCase()}
          </div>
          <Volume2 className="w-4 h-4 text-muted-foreground animate-pulse" />
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 rounded px-2 py-0.5">
        {!micEnabled && <MicOff className="w-2.5 h-2.5 text-destructive" />}
        {isScreen && <Monitor className="w-2.5 h-2.5" style={{ color: '#39FF14' }} />}
        <span className="text-[10px] text-white truncate max-w-[100px]">{name}</span>
      </div>
    </div>
  );
}

function ControlBtn({ active, onClick, icon: Icon, label, danger, highlight }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 px-3 py-2 rounded transition-colors border ${
      highlight ? 'bg-primary/20 border-primary/50 text-primary'
      : danger ? 'bg-destructive/10 border-destructive/30'
      : 'bg-secondary border-border hover:bg-muted'
    }`}>
      <Icon className={`w-4 h-4 ${danger ? 'text-destructive' : ''}`} />
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </button>
  );
}