
import React, { useState, useEffect } from 'react';
import { getOrCreatePhoneNumber } from '@/lib/phoneNumber';
import { useUser } from '@/lib/UserContext';
import { useLayout } from '@/lib/LayoutContext';
import { Button } from '@/components/ui/button';
import { LogOut, Shield, Monitor, Terminal, MessageSquare } from 'lucide-react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import OwnerPanel from '@/components/admin/OwnerPanel';
import ProfileEditor from '@/components/settings/ProfileEditor';
import ThemeEditor from '@/components/settings/ThemeEditor';
import SoundFXPanel from '@/components/settings/SoundFXPanel';

export default function Settings() {
  const { currentUser, isGuest, isMod, isOwnerAccount, logout } = useUser();
  const { chatLayout, setLayout } = useLayout();
  const queryClient = useQueryClient();

  const { data: allMembers = [] } = useQuery({
    queryKey: ['all-members'],
    queryFn: () => db.entities.ServerMember.list(),
    enabled: isMod && !isGuest,
  });

  const [promotingEmail, setPromotingEmail] = useState('');
  const [promoteStatus, setPromoteStatus] = useState('');
  const [myPhone, setMyPhone] = useState(null);
  const [editingPhone, setEditingPhone] = useState('');
  const [phoneSaved, setPhoneSaved] = useState(false);

  useEffect(() => {
    if (!currentUser || isGuest) return;
    getOrCreatePhoneNumber(currentUser).then(p => { setMyPhone(p); setEditingPhone(p.real_number || ''); });
  }, [currentUser, isGuest]);

  const saveRealNumber = async () => {
    if (!myPhone) return;
    const { base44 } = await import('@/api/chatboxClient');
    await db.entities.PhoneNumber.update(myPhone.id, { real_number: editingPhone.trim() || null });
    setMyPhone(p => ({ ...p, real_number: editingPhone.trim() || null }));
    setPhoneSaved(true);
    setTimeout(() => setPhoneSaved(false), 2000);
  };

  const handlePromote = async () => {
    if (!promotingEmail.trim()) return;
    const member = allMembers.find(m => m.user_email === promotingEmail.trim());
    if (!member) { setPromoteStatus('User not found in any server'); return; }
    await db.entities.ServerMember.update(member.id, { role: 'mod' });
    queryClient.invalidateQueries({ queryKey: ['all-members'] });
    setPromoteStatus(`✓ ${promotingEmail} promoted to mod`);
    setPromotingEmail('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-lg">
      <div className="mb-6">
        <h1 className="text-lg font-bold glow tracking-widest mb-1">SETTINGS</h1>
        <p className="text-xs text-muted-foreground">// user preferences & account</p>
      </div>

      {/* Profile editor — only for logged-in users */}
      {!isGuest && <ProfileEditor />}

      {/* Guest profile display */}
      {isGuest && (
        <div className="border border-border rounded p-4 bg-card space-y-3 mb-4">
          <p className="text-[10px] tracking-widest text-muted-foreground">PROFILE</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-sm font-bold glow-subtle">
              {(currentUser?.display_name || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold">{currentUser?.display_name || 'Guest'}</p>
              <span className="text-[9px] text-muted-foreground border border-border px-1 rounded">GUEST</span>
            </div>
          </div>
        </div>
      )}

      {/* Phone Number */}
      {!isGuest && myPhone && (
        <div className="border border-border rounded p-4 bg-card space-y-3 mb-4">
          <p className="text-[10px] tracking-widest text-muted-foreground">PHONE NUMBER</p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Assigned number</span>
              <span style={{ color: '#39FF14' }} className="font-bold">{myPhone.number}</span>
            </div>
            <p className="text-[9px] text-muted-foreground">// others can call you using this number from the Phone section</p>
            <div className="flex gap-2 pt-1">
              <input
                value={editingPhone}
                onChange={e => setEditingPhone(e.target.value)}
                placeholder="override with real number (optional)"
                className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-xs outline-none focus:border-primary"
              />
              <Button size="sm" className="text-xs" onClick={saveRealNumber}>
                {phoneSaved ? '✓' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Theme */}
      <ThemeEditor />

      {/* Chat Layout Toggle */}
      <div className="border border-border rounded p-4 bg-card space-y-3 mb-4">
        <p className="text-[10px] tracking-widest text-muted-foreground">CHAT LAYOUT</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setLayout('terminal')}
            className={`flex flex-col items-center gap-2 p-3 rounded border transition-colors ${
              chatLayout === 'terminal' ? 'border-primary bg-secondary' : 'border-border hover:bg-secondary'
            }`}
          >
            <Terminal className="w-5 h-5" />
            <span className="text-[10px] tracking-wider">TERMINAL</span>
          </button>
          <button
            onClick={() => setLayout('discord')}
            className={`flex flex-col items-center gap-2 p-3 rounded border transition-colors ${
              chatLayout === 'discord' ? 'border-primary bg-secondary' : 'border-border hover:bg-secondary'
            }`}
          >
            <Monitor className="w-5 h-5" />
            <span className="text-[10px] tracking-wider">BUBBLE</span>
          </button>
          <button
            onClick={() => setLayout('classic')}
            className={`flex flex-col items-center gap-2 p-3 rounded border transition-colors ${
              chatLayout === 'classic' ? 'border-primary bg-secondary' : 'border-border hover:bg-secondary'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] tracking-wider">CLASSIC</span>
          </button>
        </div>
      </div>

      {/* Owner Panel */}
      {isOwnerAccount && !isGuest && <OwnerPanel />}

      {/* Mod tools */}
      {isMod && !isGuest && (
        <div className="border border-border rounded p-4 bg-card space-y-3 mb-4">
          <p className="text-[10px] tracking-widest text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3" /> MOD TOOLS
          </p>
          <p className="text-[10px] text-muted-foreground">Promote a member to mod by email:</p>
          <div className="flex gap-2">
            <input
              value={promotingEmail}
              onChange={e => setPromotingEmail(e.target.value)}
              placeholder="user@email.com"
              className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-xs outline-none focus:border-primary"
            />
            <Button size="sm" className="text-xs" onClick={handlePromote}>Promote</Button>
          </div>
          {promoteStatus && <p className="text-[10px]" style={{ color: '#39FF14' }}>{promoteStatus}</p>}
        </div>
      )}

      {/* Sound FX */}
      <SoundFXPanel />

      {/* System Info */}
      <div className="border border-border rounded p-4 bg-card space-y-3 mb-4">
        <p className="text-[10px] tracking-widest text-muted-foreground">SYSTEM INFO</p>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Platform</span>
            <span>THECHATBOX v1.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Session</span>
            <span>{isGuest ? 'Guest (Anonymous)' : 'Authenticated'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span>{isGuest ? 'guest' : isMod ? 'mod' : 'member'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Layout</span>
            <span>{chatLayout}</span>
          </div>
        </div>
      </div>

      {isGuest && (
        <div className="border border-border rounded p-4 bg-card mb-4">
          <p className="text-xs text-muted-foreground mb-2">You're browsing as a guest. Login to:</p>
          <ul className="text-[10px] text-muted-foreground space-y-1">
            <li>→ Create and join private servers</li>
            <li>→ Save your messages and snippets</li>
            <li>→ Get a permanent username & profile picture</li>
          </ul>
          <Button className="w-full mt-3 text-xs" onClick={() => window.location.href = window.location.origin}>
            $ ./login.sh
          </Button>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full text-xs border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
        onClick={logout}
      >
        <LogOut className="w-3 h-3 mr-2" />
        {isGuest ? '$ exit --guest' : '$ logout'}
      </Button>
    </div>
  );
}