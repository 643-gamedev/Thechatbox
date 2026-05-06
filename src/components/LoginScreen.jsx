import React, { useState } from 'react';
import db from '@/api/chatboxClient';

import { createGuestSession } from '@/lib/guestSession';

export default function LoginScreen({ onGuest }) {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
  });

  const handleAuth = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      setStatus('Email and password are required.');
      return;
    }

    setLoading(true);
    setStatus('');

    try {
      if (mode === 'signup') {
        const result = await db.auth.signUp({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          fullName: form.fullName.trim() || form.email.split('@')[0],
        });

        if (result?.pendingVerification) {
          setStatus(result.message);
        } else {
          window.location.href = '/app';
        }
      } else {
        await db.auth.signIn(form.email.trim().toLowerCase(), form.password);
        window.location.href = '/app';
      }
    } catch (error) {
      setStatus(error.message || 'Authentication failed');
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
      <div className="scanlines fixed inset-0 z-0 pointer-events-none" />

      <div className="crt-flicker relative z-10 w-full max-w-sm mx-4">
        <div className="flex items-center gap-2 mb-1 text-[10px]" style={{ color: '#39FF14' }}>
          <span className="cursor-blink">▊</span>
          <span className="tracking-widest">THECHATBOX — AUTH TERMINAL v1.0</span>
        </div>

        <div className="border-2 p-8 space-y-5" style={{ borderColor: '#39FF14', boxShadow: '0 0 20px #39FF1444, inset 0 0 20px #39FF1411' }}>
          <div className="text-center space-y-1">
            <div className="text-4xl">🦦</div>
            <h1 className="text-xl font-bold tracking-widest glow" style={{ color: '#39FF14' }}>
              THECHATBOX
            </h1>
            <p className="text-[10px] tracking-widest" style={{ color: '#39FF1488' }}>
              // developer chat platform
            </p>
          </div>

          <div style={{ borderTop: '1px solid #39FF1444' }} />

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

          <div className="space-y-2">
            {mode === 'signup' && (
              <input
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="display name"
                className="w-full py-2 px-3 text-xs bg-black border"
                style={{ borderColor: '#39FF1444', color: '#39FF14' }}
              />
            )}
            <input
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="email"
              type="email"
              className="w-full py-2 px-3 text-xs bg-black border"
              style={{ borderColor: '#39FF1444', color: '#39FF14' }}
            />
            <input
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="password"
              type="password"
              className="w-full py-2 px-3 text-xs bg-black border"
              style={{ borderColor: '#39FF1444', color: '#39FF14' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAuth();
                }
              }}
            />
          </div>

          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full py-3 text-sm font-bold tracking-widest transition-all disabled:opacity-60"
            style={{ background: '#39FF14', color: '#000', border: 'none' }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#2acc0f')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#39FF14')}
          >
            {loading
              ? '$ processing...'
              : mode === 'login'
              ? '$ ./login.sh'
              : '$ ./register.sh'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1" style={{ borderTop: '1px solid #39FF1433' }} />
            <span className="text-[10px]" style={{ color: '#39FF1466' }}>OR</span>
            <div className="flex-1" style={{ borderTop: '1px solid #39FF1433' }} />
          </div>

          <button
            onClick={handleGuest}
            className="w-full py-3 text-xs tracking-widest transition-all"
            style={{
              background: 'transparent',
              color: '#39FF14',
              border: '1px solid #39FF1444',
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = '#39FF14')}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = '#39FF1444')}
          >
            CONTINUE AS GUEST
            <span className="block text-[9px] mt-0.5" style={{ color: '#39FF1466' }}>
              Anonymous · Auto-assigned Guest#XXXX
            </span>
          </button>

          {status && (
            <p className="text-[10px] text-center" style={{ color: '#39FF14' }}>
              {status}
            </p>
          )}
        </div>

        <p className="text-center text-[9px] mt-2" style={{ color: '#39FF1444' }}>
          guests can browse public servers • login to create & join private servers
        </p>
      </div>
    </div>
  );
}
