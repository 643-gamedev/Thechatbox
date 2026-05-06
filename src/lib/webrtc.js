// Simple WebRTC peer connection helpers for phone calls

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function createPeerConnection() {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}

export async function getUserMedia() {
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}

export function addStreamToPeer(pc, stream) {
  stream.getTracks().forEach(track => pc.addTrack(track, stream));
}

export function attachRemoteStream(pc, audioEl) {
  pc.ontrack = (e) => {
    if (audioEl) {
      audioEl.srcObject = e.streams[0];
      audioEl.play().catch(() => {});
    }
  };
}