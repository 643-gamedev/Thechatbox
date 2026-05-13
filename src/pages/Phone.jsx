
import React, { useState, useEffect, useRef } from 'react';

import { useUser } from '@/lib/UserContext';
import { getOrCreatePhoneNumber, findPhoneRecord } from '@/lib/phoneNumber';
import { createPeerConnection, getUserMedia, addStreamToPeer, attachRemoteStream } from '@/lib/webrtc';
import { playConnectingRing } from '@/lib/sounds';
import Dialpad from '@/components/phone/Dialpad';
import ActiveCallUI from '@/components/phone/ActiveCallUI';
import { Phone } from 'lucide-react';

export default function PhonePage() {
  const { currentUser } = useUser();
  const [myPhone, setMyPhone] = useState(null);
  const [tab, setTab] = useState('dialpad'); // 'dialpad' | 'friends'
  const [friends, setFriends] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [callLoading, setCallLoading] = useState(false);
  const [status, setStatus] = useState('');

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pollRef = useRef(null);
  const stopRingbackRef = useRef(null);

  // Load my phone number
  useEffect(() => {
    if (!currentUser) return;
    getOrCreatePhoneNumber(currentUser).then(setMyPhone);
  }, [currentUser]);

  // Load friends (accepted friend requests)
  useEffect(() => {
    if (!currentUser) return;
    const loadFriends = async () => {
      const sent = await db.entities.FriendRequest.filter({ from_email: currentUser.email, status: 'accepted' });
      const recv = await db.entities.FriendRequest.filter({ to_email: currentUser.email, status: 'accepted' });
      const all = [
        ...sent.map(r => ({ email: r.to_email, name: r.to_name })),
        ...recv.map(r => ({ email: r.from_email, name: r.from_name })),
      ];
      // Load phone numbers for friends
      const withNumbers = await Promise.all(
        all.map(async f => {
          const rec = await db.entities.PhoneNumber.filter({ user_email: f.email });
          return { ...f, number: rec[0]?.number || 'no number' };
        })
      );
      setFriends(withNumbers);
    };
    loadFriends();
  }, [currentUser]);

  // Poll for call status changes when in a call
  useEffect(() => {
    if (!activeCall) return;
    pollRef.current = setInterval(async () => {
      const updated = await db.entities.PhoneCall.filter({ id: activeCall.id });
      if (!updated || !updated[0]) return;
      const call = updated[0];

      if (call.status === 'declined' || call.status === 'ended') {
        if (stopRingbackRef.current) { stopRingbackRef.current(); stopRingbackRef.current = null; }
        hangup(true);
        return;
      }

      // If we're the caller and call just got answered — stop ringback
      if (call.status === 'active' && stopRingbackRef.current) {
        stopRingbackRef.current(); stopRingbackRef.current = null;
      }

      // If we're the caller and call just got answered
      if (call.status === 'active' && call.answer_sdp && pcRef.current && pcRef.current.signalingState !== 'stable') {
        try {
          await pcRef.current.setRemoteDescription(JSON.parse(call.answer_sdp));
          // Add callee ICE candidates
          const callee_ice = call.callee_ice ? JSON.parse(call.callee_ice) : [];
          for (const c of callee_ice) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          }
        } catch {}
      }

      setActiveCall(call);
    }, 1500);

    return () => clearInterval(pollRef.current);
  }, [activeCall?.id]);

  const startCall = async (targetNumberOrEmail) => {
    setCallLoading(true);
    setStatus('looking up number...');
    try {
      const target = await findPhoneRecord(targetNumberOrEmail);
      if (!target) { setStatus('// number not found'); setCallLoading(false); return; }
      if (target.user_email === currentUser.email) { setStatus('// cannot call yourself'); setCallLoading(false); return; }

      setStatus('connecting...');

      // Get mic
      const stream = await getUserMedia();
      localStreamRef.current = stream;

      // Create peer connection
      const pc = createPeerConnection();
      pcRef.current = pc;
      addStreamToPeer(pc, stream);
      attachRemoteStream(pc, remoteAudioRef.current);

      // Collect ICE candidates
      const iceCandidates = [];
      pc.onicecandidate = (e) => { if (e.candidate) iceCandidates.push(e.candidate); };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering
      await new Promise(res => setTimeout(res, 1000));

      // Create call record
      const call = await db.entities.PhoneCall.create({
        caller_email: currentUser.email,
        caller_name: currentUser.full_name,
        caller_number: myPhone?.number,
        callee_email: target.user_email,
        callee_name: target.user_name,
        callee_number: target.number,
        status: 'ringing',
        offer_sdp: JSON.stringify(pc.localDescription),
        caller_ice: JSON.stringify(iceCandidates),
      });

      setActiveCall(call);
      setStatus('ringing...');
      // Start PSTN ringback tone while waiting
      try { stopRingbackRef.current = playConnectingRing(); } catch {}
    } catch (err) {
      setStatus('// error: ' + err.message);
    }
    setCallLoading(false);
  };

  const hangup = async (skipUpdate = false) => {
    if (stopRingbackRef.current) { stopRingbackRef.current(); stopRingbackRef.current = null; }
    clearInterval(pollRef.current);
    if (!skipUpdate && activeCall) {
      await db.entities.PhoneCall.update(activeCall.id, { status: 'ended' }).catch(() => {});
    }
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    setActiveCall(null);
    setStatus('');
  };

  if (activeCall) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="h-12 border-b border-border flex items-center px-4 gap-2 bg-card flex-shrink-0">
          <Phone className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-bold glow-subtle">
            {activeCall.status === 'ringing' ? 'CALLING...' : 'IN CALL'}
          </span>
        </div>
      <audio ref={remoteAudioRef} autoPlay className="hidden" />
        {activeCall.status === 'ringing' && activeCall.caller_email === currentUser?.email ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border-2 animate-pulse"
              style={{ borderColor: '#39FF14', background: '#0a1a0a', color: '#39FF14' }}>
              {(activeCall.callee_name || '?')[0].toUpperCase()}
            </div>
            <p className="text-lg font-bold glow">{activeCall.callee_name}</p>
            <p className="text-xs text-muted-foreground">{activeCall.callee_number}</p>
            <p className="text-xs text-muted-foreground animate-pulse">ringing...</p>
            <button onClick={() => hangup()} className="mt-4 px-6 py-2 rounded-full text-sm font-bold"
              style={{ background: '#ff3333', color: '#fff' }}>
              Cancel
            </button>
          </div>
        ) : (
          <ActiveCallUI call={activeCall} currentUser={currentUser} onHangup={() => hangup()} localStream={localStreamRef.current} />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center px-4 gap-2 bg-card flex-shrink-0">
        <Phone className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-bold glow-subtle">PHONE</span>
        {myPhone && (
          <span className="ml-auto text-[10px] text-muted-foreground">your number: <span style={{ color: '#39FF14' }}>{myPhone.real_number || myPhone.number}</span></span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border flex-shrink-0">
        {[['dialpad', 'DIALPAD'], ['friends', 'FRIENDS']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-6 py-2 text-[10px] tracking-widest transition-colors ${tab === id ? 'border-b border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Status */}
      {status && (
        <div className="px-4 py-1.5 text-[10px] text-muted-foreground border-b border-border bg-card">
          {status}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {tab === 'dialpad' && (
          <Dialpad onCall={startCall} loading={callLoading} />
        )}

        {tab === 'friends' && (
          <div className="p-4 space-y-2 max-w-md mx-auto">
            {friends.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">// no friends yet — add some via DMs</p>
            ) : friends.map(f => (
              <div key={f.email} className="flex items-center gap-3 p-3 border border-border rounded bg-card hover:bg-secondary transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: '#39FF1422', color: '#39FF14', border: '1px solid #39FF1444' }}>
                  {(f.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold">{f.name}</p>
                  <p className="text-[10px] text-muted-foreground">{f.number}</p>
                </div>
                <button
                  onClick={() => startCall(f.email)}
                  disabled={callLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold disabled:opacity-40"
                  style={{ background: '#39FF14', color: '#000' }}
                >
                  <Phone className="w-3 h-3" /> Call
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
