
import React, { useEffect, useState, useRef } from 'react';

import { useUser } from '@/lib/UserContext';
import { getOrCreatePhoneNumber } from '@/lib/phoneNumber';
import { createPeerConnection, getUserMedia, addStreamToPeer, attachRemoteStream } from '@/lib/webrtc';
import { playJP3Ringtone } from '@/lib/sounds';
import IncomingCallOverlay from './IncomingCallOverlay';
import ActiveCallUI from './ActiveCallUI';

export default function IncomingCallListener({ children }) {
  const { currentUser } = useUser();
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const pollRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const stopRingtoneRef = useRef(null);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Poll for incoming calls
  useEffect(() => {
    if (!currentUser) return;
    let lastCallId = null;

    const poll = async () => {
      const calls = await db.entities.PhoneCall.filter({
        callee_email: currentUser.email,
        status: 'ringing',
      });
      const call = calls && calls[0];

      if (call && call.id !== lastCallId) {
        lastCallId = call.id;
        setIncomingCall(call);
        // Play JP3 ringtone
        if (stopRingtoneRef.current) { stopRingtoneRef.current(); }
        try { stopRingtoneRef.current = playJP3Ringtone(); } catch {}
        // Show push notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('📞 Incoming Call', {
            body: `${call.caller_name} is calling you`,
            icon: '/favicon.ico',
            tag: 'incoming-call',
          });
        }
      } else if (!call && incomingCall) {
        // Call was cancelled — stop ringtone
        if (stopRingtoneRef.current) { stopRingtoneRef.current(); stopRingtoneRef.current = null; }
        setIncomingCall(null);
        lastCallId = null;
      }

      // Poll active call for ended status
      if (activeCall) {
        const updated = await db.entities.PhoneCall.filter({ id: activeCall.id });
        if (updated && updated[0] && (updated[0].status === 'ended' || updated[0].status === 'declined')) {
          hangup(true);
        }
      }
    };

    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [currentUser, incomingCall, activeCall]);

  const accept = async () => {
    if (stopRingtoneRef.current) { stopRingtoneRef.current(); stopRingtoneRef.current = null; }
    const call = incomingCall;
    setIncomingCall(null);

    try {
      const stream = await getUserMedia();
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      pcRef.current = pc;
      addStreamToPeer(pc, stream);
      attachRemoteStream(pc, remoteAudioRef.current);

      const iceCandidates = [];
      pc.onicecandidate = (e) => { if (e.candidate) iceCandidates.push(e.candidate); };

      // Set remote offer
      await pc.setRemoteDescription(JSON.parse(call.offer_sdp));

      // Add caller ICE candidates
      const callerIce = call.caller_ice ? JSON.parse(call.caller_ice) : [];
      for (const c of callerIce) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await new Promise(res => setTimeout(res, 800));

      await db.entities.PhoneCall.update(call.id, {
        status: 'active',
        answer_sdp: JSON.stringify(pc.localDescription),
        callee_ice: JSON.stringify(iceCandidates),
      });

      setActiveCall({ ...call, status: 'active' });
    } catch (err) {
      await db.entities.PhoneCall.update(call.id, { status: 'declined' }).catch(() => {});
    }
  };

  const decline = async () => {
    if (stopRingtoneRef.current) { stopRingtoneRef.current(); stopRingtoneRef.current = null; }
    if (incomingCall) {
      await db.entities.PhoneCall.update(incomingCall.id, { status: 'declined' }).catch(() => {});
    }
    setIncomingCall(null);
  };

  const hangup = async (skipUpdate = false) => {
    if (!skipUpdate && activeCall) {
      await db.entities.PhoneCall.update(activeCall.id, { status: 'ended' }).catch(() => {});
    }
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    setActiveCall(null);
  };

  return (
    <>
      {children}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <IncomingCallOverlay call={incomingCall} onAccept={accept} onDecline={decline} />
      {/* Active call overlay (floating, if not on phone page) */}
      {activeCall && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto w-80 border border-border rounded-xl shadow-2xl overflow-hidden"
            style={{ background: '#0a1a0a', boxShadow: '0 0 40px #39FF1444' }}>
            <ActiveCallUI call={activeCall} currentUser={currentUser} onHangup={() => hangup()} localStream={localStreamRef.current} />
          </div>
        </div>
      )}
    </>
  );
}