
import React, { useState } from 'react';

import { createGuestSession } from '@/lib/guestSession';
import { db } from '@/api/base44Client';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

export default function LoginScreen({ onGuest }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!isSupabaseConfigured) {
      setStatus('Supabase env vars are missing. Check .env.');
      return;
    }
    if (!email.trim() || !password.trim()) {
      setStatus('Email and password are required.');
      return;
    }

    setLoading(true);
    setStatus('');
    try {
      if (mode === 'signup') {
        await db.auth.signUpWithPassword({
          email: email.trim(),
          password,
          fullName: fullName.trim() || email.trim(),
        });
        setStatus('Account created. You can now log in.');
      } else {
        await db.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        window.location.href = '/app';
      }
    } catch (error) {
      setStatus(error.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    const session = createGuestSession();
    onGuest(session);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden">
      {/* Scanlines */}
      <div className="scanlines fixed inset-0 z-0 pointer-events-none" />

      {/* Flicker wrapper */}
      <div className="crt-flicker relative z-10 w-full max-w-sm mx-4">
        {/* Top bar */}
        <div className="flex items-center gap-2 mb-1 text-[10px]" style={{ color: '#39FF14' }}>
          <span className="cursor-blink">▊</span>
          <span className="tracking-widest">THECHATBOX — AUTH TERMINAL v1.0</span>
        </div>

        {/* Box */}
        <div
          className="border-2 p-8 space-y-5"
          style={{ borderColor: '#39FF14', boxShadow: '0 0 20px #39FF1444, inset 0 0 20px #39FF1411' }}
        >
          {/* Logo */}
          <div className="text-center space-y-1">
            <div className="text-4xl">🦦</div>
            <h1
              className="text-xl font-bold tracking-widest glow"
              style={{ color: '#39FF14' }}
            >
              THECHATBOX
            </h1>
            <p className="text-[10px] tracking-widest" style={{ color: '#39FF1488' }}>
              // developer chat platform
            </p>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #39FF1444' }} />

          {/* Mode tabs */}
          <div className="flex text-xs border" style={{ borderColor: '#39FF1444' }}>
            <button
              onClick={() => setMode('login')}
              className="flex-1 py-2 tracking-wider transition-colors"
              style={{
                background: mode === 'login' ? '#39FF1422' : 'transparent',
                color: '#39FF14',
                borderRight: '1px solid #39FF1444',
              }}
            >
              LOGIN
            </button>
            <button
              onClick={() => setMode('signup')}
              className="flex-1 py-2 tracking-wider transition-colors"
              style={{
                background: mode === 'signup' ? '#39FF1422' : 'transparent',
                color: '#39FF14',
              }}
            >
              SIGN UP
            </button>
          </div>

          {/* Main action */}
          <div className="space-y-3">
            <p className="text-[11px] text-center" style={{ color: '#39FF1488' }}>
              {mode === 'login'
                ? '> Sign in with email + password'
                : '> Create account with email + password'}
            </p>
            {mode === 'signup' && (
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="display name"
                className="w-full bg-black border px-3 py-2 text-xs outline-none"
                style={{ borderColor: '#39FF1444', color: '#39FF14' }}
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
              className="w-full bg-black border px-3 py-2 text-xs outline-none"
              style={{ borderColor: '#39FF1444', color: '#39FF14' }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              className="w-full bg-black border px-3 py-2 text-xs outline-none"
              style={{ borderColor: '#39FF1444', color: '#39FF14' }}
            />
            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full py-3 text-sm font-bold tracking-widest transition-all"
              style={{
                background: '#39FF14',
                color: '#000',
                border: 'none',
                opacity: loading ? 0.6 : 1,
              }}
              onMouseOver={e => (e.currentTarget.style.background = '#2acc0f')}
              onMouseOut={e => (e.currentTarget.style.background = '#39FF14')}
            >
              {loading ? '$ ./auth.sh --wait' : mode === 'login' ? '$ ./login.sh' : '$ ./register.sh'}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1" style={{ borderTop: '1px solid #39FF1433' }} />
            <span className="text-[10px]" style={{ color: '#39FF1466' }}>OR</span>
            <div className="flex-1" style={{ borderTop: '1px solid #39FF1433' }} />
          </div>

          {/* Guest button */}
          <button
            onClick={handleGuest}
            className="w-full py-3 text-xs tracking-widest transition-all"
            style={{
              background: 'transparent',
              color: '#39FF14',
              border: '1px solid #39FF1444',
            }}
            onMouseOver={e => (e.currentTarget.style.borderColor = '#39FF14')}
            onMouseOut={e => (e.currentTarget.style.borderColor = '#39FF1444')}
          >
            CONTINUE AS GUEST
            <span className="block text-[9px] mt-0.5" style={{ color: '#39FF1466' }}>
              Anonymous · Auto-assigned Guest#XXXX
            </span>
          </button>

          {/* Status */}
          {status && <p className="text-[10px] text-center" style={{ color: '#39FF14' }}>{status}</p>}
        </div>

        {/* Footer note */}
        <p className="text-center text-[9px] mt-2" style={{ color: '#39FF1444' }}>
          guests can browse public servers • login to create & join private servers
        </p>
      </div>
    </div>
  );
}
