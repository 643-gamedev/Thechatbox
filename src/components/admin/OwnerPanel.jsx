import db from '@/api/chatboxClient';


import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Shield, Trash2, Ban, UserCheck, Server, Hash } from 'lucide-react';

export default function OwnerPanel() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('users');
  const [status, setStatus] = useState('');

  const { data: allUsers = [] } = useQuery({
    queryKey: ['owner-users'],
    queryFn: () => db.entities.User.list(),
    enabled: tab === 'users',
  });

  const { data: allServers = [] } = useQuery({
    queryKey: ['owner-servers'],
    queryFn: () => db.entities.Server.list(),
    enabled: tab === 'servers',
  });

  const { data: allChannels = [] } = useQuery({
    queryKey: ['owner-channels'],
    queryFn: () => db.entities.Channel.list(),
    enabled: tab === 'channels',
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['owner-messages'],
    queryFn: () => db.entities.Message.list('-created_date', 50),
    enabled: tab === 'messages',
  });

  const setRole = async (userId, role) => {
    await db.entities.User.update(userId, { role });
    queryClient.invalidateQueries({ queryKey: ['owner-users'] });
    setStatus(`✓ Role updated to ${role}`);
  };

  const banUser = async (user) => {
    await db.entities.User.update(user.id, { banned: true, ban_reason: 'Banned by owner' });
    queryClient.invalidateQueries({ queryKey: ['owner-users'] });
    setStatus(`✓ ${user.email} banned`);
  };

  const unbanUser = async (user) => {
    await db.entities.User.update(user.id, { banned: false, ban_reason: '' });
    queryClient.invalidateQueries({ queryKey: ['owner-users'] });
    setStatus(`✓ ${user.email} unbanned`);
  };

  const deleteServer = async (id) => {
    if (!confirm('Delete this server and all its channels?')) return;
    await db.entities.Server.delete(id);
    queryClient.invalidateQueries({ queryKey: ['owner-servers'] });
    setStatus('✓ Server deleted');
  };

  const deleteChannel = async (id) => {
    await db.entities.Channel.delete(id);
    queryClient.invalidateQueries({ queryKey: ['owner-channels'] });
    setStatus('✓ Channel deleted');
  };

  const deleteMessage = async (id) => {
    await db.entities.Message.delete(id);
    queryClient.invalidateQueries({ queryKey: ['owner-messages'] });
    setStatus('✓ Message deleted');
  };

  const TABS = ['users', 'servers', 'channels', 'messages'];

  return (
    <div className="border border-border rounded p-4 bg-card space-y-3">
      <p className="text-[10px] tracking-widest flex items-center gap-1" style={{ color: '#39FF14' }}>
        <Shield className="w-3 h-3" /> OWNER PANEL
      </p>

      {/* Tabs */}
      <div className="flex gap-1">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-[10px] tracking-wider px-2 py-1 rounded border transition-colors ${
              tab === t ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-secondary'
            }`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {status && <p className="text-[10px]" style={{ color: '#39FF14' }}>{status}</p>}

      {/* Users */}
      {tab === 'users' && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {allUsers.map(u => (
            <div key={u.id} className="flex items-center gap-2 py-1.5 border-b border-border/50">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] truncate">{u.full_name || u.email}</p>
                <p className="text-[9px] text-muted-foreground">{u.email} · {u.role}{u.banned ? ' · BANNED' : ''}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <select
                  value={u.role || 'user'}
                  onChange={e => setRole(u.id, e.target.value)}
                  className="text-[9px] bg-background border border-border rounded px-1 py-0.5"
                >
                  <option value="user">user</option>
                  <option value="mod">mod</option>
                  <option value="admin">admin</option>
                  <option value="owner">owner</option>
                </select>
                {u.banned ? (
                  <button onClick={() => unbanUser(u)} title="Unban" className="p-1 hover:bg-secondary rounded">
                    <UserCheck className="w-3 h-3 text-primary" />
                  </button>
                ) : (
                  <button onClick={() => banUser(u)} title="Ban" className="p-1 hover:bg-secondary rounded">
                    <Ban className="w-3 h-3 text-destructive" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Servers */}
      {tab === 'servers' && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {allServers.map(s => (
            <div key={s.id} className="flex items-center gap-2 py-1.5 border-b border-border/50">
              <Server className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] truncate">{s.icon} {s.name}</p>
                <p className="text-[9px] text-muted-foreground">{s.owner_email} · {s.is_public ? 'public' : 'private'}</p>
              </div>
              {!s.is_main && (
                <button onClick={() => deleteServer(s.id)} className="p-1 hover:bg-secondary rounded">
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Channels */}
      {tab === 'channels' && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {allChannels.map(c => (
            <div key={c.id} className="flex items-center gap-2 py-1.5 border-b border-border/50">
              <Hash className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] truncate">#{c.name}</p>
                <p className="text-[9px] text-muted-foreground">{c.category} · server: {c.server_id}</p>
              </div>
              <button onClick={() => deleteChannel(c.id)} className="p-1 hover:bg-secondary rounded">
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      {tab === 'messages' && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {allMessages.map(m => (
            <div key={m.id} className="flex items-start gap-2 py-1.5 border-b border-border/50">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-muted-foreground">{m.author_name} · #{m.channel_id?.slice(0, 8)}</p>
                <p className="text-[11px] truncate">{m.content}</p>
              </div>
              <button onClick={() => deleteMessage(m.id)} className="p-1 hover:bg-secondary rounded flex-shrink-0">
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}