import React, { useEffect, useState, useRef } from 'react';
import { playDialupModem, stopDialupModem } from '@/lib/sounds';

// Shows a full-screen dialup loading screen on first app open.
// Lasts as long as the audio (26s) or until user skips.
// Calls onDone() when finished.

const LINES = [
  'THECHATBOX OS v1.0.0',
  'Initializing hardware...',
  'Detecting modem on COM3...',
  'ATZ OK',
  'ATDT 1-800-762-8738',
  'Dialing ISP...',
  '',
  'CONNECT 56000 V.92',
  'Authenticating...',
  'PPP negotiation complete',
  'IP: 192.168.0.' + Math.floor(Math.random() * 200 + 10),
  'DNS: 8.8.8.8',
  '',
  'Loading THECHATBOX...',
];

export default function DialupLoadingScreen({ onDone }) {
  const [visibleLines, setVisibleLines] = useState([]);
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState('');
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    stopDialupModem();
    onDone();
  };

  useEffect(() => {
    // Mark first load so we don't show again on navigation
    sessionStorage.setItem('dialup_shown', '1');

    // Play sound — lasts ~26s
    playDialupModem();

    // Reveal terminal lines one by one
    let i = 0;
    const lineInterval = setInterval(() => {
      if (i < LINES.length) {
        setVisibleLines(prev => [...prev, LINES[i]]);
        i++;
      } else {
        clearInterval(lineInterval);
      }
    }, 1600);

    // Progress bar over 26s
    const start = Date.now();
    const DURATION = 26000;
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(progressInterval);
        setTimeout(finish, 400);
      }
    }, 100);

    // Blinking dots
    const dotsInterval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);

    return () => {
      clearInterval(lineInterval);
      clearInterval(progressInterval);
      clearInterval(dotsInterval);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
      style={{ fontFamily: "'Cutive Mono', monospace" }}
    >
      {/* Scanlines */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #39FF1405 2px, #39FF1405 4px)',
        }}
      />

      <div className="w-full max-w-xl px-6 space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-4">
          <p className="text-3xl mb-1" style={{ color: '#39FF14', textShadow: '0 0 10px #39FF14' }}>🦦</p>
          <p className="text-xs tracking-[0.4em]" style={{ color: '#39FF14' }}>THECHATBOX</p>
        </div>

        {/* Terminal output */}
        <div
          className="border rounded p-4 min-h-48 text-xs space-y-1 overflow-hidden"
          style={{ borderColor: '#39FF1433', background: '#050f05' }}
        >
          {visibleLines.map((line, idx) => (
            <p key={idx} style={{ color: line === '' ? 'transparent' : '#39FF14' }}>
              {line === '' ? '.' : `> ${line}`}
            </p>
          ))}
          {visibleLines.length < LINES.length && (
            <p style={{ color: '#39FF14' }}>
              {'> '}<span className="cursor-blink">_</span>
            </p>
          )}
          {visibleLines.length >= LINES.length && (
            <p style={{ color: '#39FF14' }}>
              {`> Connecting${dots}`}
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-[10px] mb-1" style={{ color: '#39FF1488' }}>
            <span>LOADING</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded overflow-hidden" style={{ background: '#0a1a0a', border: '1px solid #39FF1433' }}>
            <div
              className="h-full transition-all duration-100"
              style={{
                width: `${progress}%`,
                background: '#39FF14',
                boxShadow: '0 0 8px #39FF14',
              }}
            />
          </div>
        </div>

        {/* Skip button */}
        <div className="text-center">
          <button
            onClick={finish}
            className="text-[10px] px-4 py-2 rounded border transition-colors hover:bg-white/5"
            style={{ borderColor: '#39FF1444', color: '#39FF1488' }}
          >
            [ SKIP / STOP SOUND ]
          </button>
        </div>
      </div>
    </div>
  );
}