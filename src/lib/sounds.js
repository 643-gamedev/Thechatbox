// Web Audio API sound effects — no external files needed

function ctx() {
  if (!window._audioCtx) {
    window._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return window._audioCtx;
}

function playTone(frequency, duration, type = 'sine', gain = 0.3, delay = 0) {
  const c = ctx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.connect(g);
  g.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, c.currentTime + delay);
  g.gain.setValueAtTime(0, c.currentTime + delay);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + delay + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
  osc.start(c.currentTime + delay);
  osc.stop(c.currentTime + delay + duration + 0.05);
}

// Join call — ascending two-tone (like Google Meet join)
export function playJoinSound() {
  playTone(440, 0.15, 'sine', 0.25, 0);
  playTone(660, 0.2, 'sine', 0.25, 0.15);
}

// Leave call — descending two-tone
export function playLeaveSound() {
  playTone(660, 0.15, 'sine', 0.25, 0);
  playTone(440, 0.2, 'sine', 0.25, 0.15);
}

// Someone else joined — subtle single blip
export function playUserJoinedSound() {
  playTone(880, 0.1, 'sine', 0.15, 0);
  playTone(1100, 0.12, 'sine', 0.12, 0.08);
}

// Someone left — subtle downward blip
export function playUserLeftSound() {
  playTone(660, 0.1, 'sine', 0.12, 0);
  playTone(520, 0.12, 'sine', 0.10, 0.08);
}

// ─── 56k Dialup Modem SFX ────────────────────────────────────────────────────
// Plays the real dialup modem MP3 from soundjay.com
// Returns a promise that resolves when the audio ends (or is stopped)
let _dialupAudio = null;

export function playDialupModem() {
  if (_dialupAudio) { _dialupAudio.pause(); _dialupAudio = null; }
  const audio = new Audio('https://www.soundjay.com/communication_c2026/dial-up-modem-01.mp3');
  audio.volume = 0.7;
  _dialupAudio = audio;

  const duration = 26000; // ~26s track length

  const promise = new Promise((resolve) => {
    audio.addEventListener('ended', resolve, { once: true });
    audio.addEventListener('error', resolve, { once: true });
    // fallback in case audio never loads
    const timer = setTimeout(resolve, duration + 2000);
    audio.addEventListener('ended', () => clearTimeout(timer), { once: true });
  });

  audio.play().catch(() => {});
  return { promise, duration };
}

export function stopDialupModem() {
  if (_dialupAudio) { _dialupAudio.pause(); _dialupAudio.currentTime = 0; _dialupAudio = null; }
}

// ─── Jurassic Park 3 Satellite Phone Ringtone ────────────────────────────────
// "Brennan, I'm going to hang up now" — the iconic Nokia-style JP3 ring
// Returns a stop function to cancel the loop.
export function playJP3Ringtone() {
  const c = ctx();
  let stopped = false;
  let nodes = [];

  const NOTE = {
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
    G5: 783.99, A5: 880.00, B5: 987.77,
    C6: 1046.50, D6: 1174.66, E6: 1318.51,
    REST: 0,
  };

  // JP3 satellite phone melody — the iconic sequence
  const melody = [
    [NOTE.E5, 0.18], [NOTE.E5, 0.18], [NOTE.REST, 0.06],
    [NOTE.E5, 0.18], [NOTE.REST, 0.06], [NOTE.C5, 0.18], [NOTE.E5, 0.36],
    [NOTE.G5, 0.36], [NOTE.REST, 0.36], [NOTE.G5, 0.36], [NOTE.REST, 0.36],
    [NOTE.C5, 0.27], [NOTE.REST, 0.09], [NOTE.G5, 0.27], [NOTE.REST, 0.09],
    [NOTE.E5, 0.27], [NOTE.REST, 0.09], [NOTE.A5, 0.18], [NOTE.B5, 0.18],
    [NOTE.REST, 0.06], [NOTE.A5, 0.18], [NOTE.G5, 0.24], [NOTE.E6, 0.24],
    [NOTE.G5, 0.24], [NOTE.A5, 0.18], [NOTE.F5, 0.18], [NOTE.G5, 0.18],
    [NOTE.REST, 0.06], [NOTE.E5, 0.18], [NOTE.C5, 0.18], [NOTE.D5, 0.18],
    [NOTE.B5, 0.27], [NOTE.REST, 0.45],
  ];

  const scheduleLoop = (startTime) => {
    if (stopped) return;
    const master = c.createGain();
    master.gain.setValueAtTime(0.25, startTime);
    master.connect(c.destination);
    nodes.push(master);

    let t = startTime;
    melody.forEach(([freq, dur]) => {
      if (freq === NOTE.REST) { t += dur; return; }
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.4, t + 0.01);
      g.gain.setValueAtTime(0.4, t + dur - 0.03);
      g.gain.linearRampToValueAtTime(0, t + dur);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + dur + 0.01);
      nodes.push(osc);
      t += dur;
    });

    // Schedule next loop with 0.8s gap
    const loopDuration = t - startTime + 0.8;
    if (!stopped) {
      setTimeout(() => scheduleLoop(c.currentTime), loopDuration * 1000 - 200);
    }
  };

  scheduleLoop(c.currentTime);

  return () => {
    stopped = true;
    nodes.forEach(n => { try { n.disconnect(); } catch {} });
    nodes = [];
  };
}

// ─── Connecting / Outbound Call Ring ─────────────────────────────────────────
// Classic PSTN ringback tone: 440+480Hz, on 2s off 4s
export function playConnectingRing() {
  const c = ctx();
  let stopped = false;
  let nodes = [];

  const scheduleRing = (startT) => {
    if (stopped) return;
    [440, 480].forEach(freq => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startT);
      g.gain.setValueAtTime(0, startT);
      g.gain.linearRampToValueAtTime(0.15, startT + 0.05);
      g.gain.setValueAtTime(0.15, startT + 2.0);
      g.gain.linearRampToValueAtTime(0, startT + 2.1);
      osc.connect(g); g.connect(c.destination);
      osc.start(startT); osc.stop(startT + 2.15);
      nodes.push(osc);
    });
    // 2s ring, 4s silence = 6s cycle
    setTimeout(() => scheduleRing(c.currentTime), 6000);
  };

  scheduleRing(c.currentTime);

  return () => {
    stopped = true;
    nodes.forEach(n => { try { n.disconnect(); } catch {} });
    nodes = [];
  };
}