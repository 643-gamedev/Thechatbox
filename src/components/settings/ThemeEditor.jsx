import db from '@/api/chatboxClient';


import React from 'react';
// ThemeEditor — no changes needed here
import { useLayout } from '@/lib/LayoutContext';
import { useUser } from '@/lib/UserContext';

const THEMES = [
  { id: 'green',  label: 'Matrix',   color: '#39FF14', bg: '#0a1a0a' },
  { id: 'blue',   label: 'Cobalt',   color: '#00BFFF', bg: '#0a0f1a' },
  { id: 'purple', label: 'Neon',     color: '#BF5FFF', bg: '#0f0a1a' },
  { id: 'orange', label: 'Ember',    color: '#FF6B35', bg: '#1a0f0a' },
  { id: 'red',    label: 'Blood',    color: '#FF2244', bg: '#1a0a0f' },
  { id: 'white',  label: 'Ghost',    color: '#DDDDDD', bg: '#111111' },
];

export default function ThemeEditor() {
  const { theme, setTheme } = useLayout();
  const { currentUser, isGuest, refreshUser } = useUser();

  const handleTheme = async (t) => {
    setTheme(t.id);
    if (!isGuest && currentUser) {
      await db.auth.updateMe({ theme: t.id });
      await refreshUser();
    }
  };

  return (
    <div className="border border-border rounded p-4 bg-card space-y-3 mb-4">
      <p className="text-[10px] tracking-widest text-muted-foreground">COLOR THEME</p>
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map(t => (
          <button
            key={t.id}
            onClick={() => handleTheme(t)}
            className="flex flex-col items-center gap-1.5 p-3 rounded border transition-all"
            style={{
              borderColor: theme === t.id ? t.color : '#39FF1433',
              background: theme === t.id ? t.bg : 'transparent',
            }}
          >
            <div className="w-6 h-6 rounded-full" style={{ background: t.color, boxShadow: `0 0 8px ${t.color}88` }} />
            <span className="text-[10px]" style={{ color: theme === t.id ? t.color : '#666' }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}