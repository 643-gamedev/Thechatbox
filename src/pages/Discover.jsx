
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Search, Globe, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUser } from '@/lib/UserContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const SOURCE_OPTIONS = [
  { key: 'chatbox', label: 'Chatbox Servers' },
  { key: 'discord', label: 'Discord Servers' },
  { key: 'stoat', label: 'Stoat Servers' },
];

const NSFW_TERMS = [
  'nsfw',
  '18+',
  'adult',
  'porn',
  'sex',
  'erotic',
  'hentai',
  'fetish',
];

function isSafeServer(server) {
  if (!server) return false;
  if (server.is_nsfw || server.nsfw || server.age_restricted) return false;
  const text = `${server.name || ''} ${server.description || ''}`.toLowerCase();
  return !NSFW_TERMS.some((term) => text.includes(term));
}

export default function Discover() {
  const { currentUser, isGuest } = useUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('chatbox');

  const { data: servers = [] } = useQuery({
    queryKey: ['public-servers'],
    queryFn: () => db.entities.Server.filter({ is_public: true }),
  });

  const bridgeBase = import.meta.env.VITE_STOAT_BRIDGE_URL || '';
  const { data: externalServers = [] } = useQuery({
    queryKey: ['discover-external', source],
    enabled: source !== 'chatbox' && Boolean(bridgeBase),
    queryFn: async () => {
      const url = `${bridgeBase.replace(/\/$/, '')}/discover/servers?source=${encodeURIComponent(source)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Discover API failed: ${res.status}`);
      }
      const payload = await res.json().catch(() => ({}));
      return Array.isArray(payload.servers) ? payload.servers : [];
    },
  });

  const sourceServers = source === 'chatbox' ? servers : externalServers;
  const safeServers = sourceServers.filter(isSafeServer);
  const filtered = safeServers.filter(
    (s) =>
      (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(search.toLowerCase()),
  );

  const handleJoin = async (server) => {
    if (isGuest) {
      toast.error('Login to join servers');
      return;
    }
    await db.entities.ServerMember.create({
      server_id: server.id,
      user_email: currentUser.email,
      display_name: currentUser.full_name || currentUser.email,
      role: 'member',
    });
    queryClient.invalidateQueries({ queryKey: ['servers'] });
    toast.success(`Joined ${server.name}!`);
    navigate(`/server/${server.id}`);
  };

  const handleOpenExternal = (server) => {
    if (!server?.invite_url) {
      toast.error('No invite URL configured for this server.');
      return;
    }
    window.open(server.invite_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold glow tracking-widest mb-1">DISCOVER SERVERS</h1>
        <p className="text-xs text-muted-foreground">// chatbox + discord + stoat (NSFW filtered)</p>
      </div>

      {/* Source Toggle */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SOURCE_OPTIONS.map((option) => (
          <Button
            key={option.key}
            onClick={() => setSource(option.key)}
            variant={source === option.key ? 'default' : 'outline'}
            size="sm"
            className="text-xs"
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="search servers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-background border-border text-xs"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(server => (
          <div
            key={server.id}
            className="border border-border rounded p-4 bg-card hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{server.icon || '🦦'}</span>
                <div>
                  <h3 className="text-xs font-bold glow-subtle">{server.name}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Globe className="w-2.5 h-2.5 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground">Public</span>
                  </div>
                </div>
              </div>
            </div>

            {server.description && (
              <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2">{server.description}</p>
            )}

            {source === 'chatbox' ? (
              <Button
                onClick={() => handleJoin(server)}
                size="sm"
                variant="outline"
                className="w-full mt-3 text-xs border-border hover:bg-secondary"
              >
                $ join --server
              </Button>
            ) : (
              <Button
                onClick={() => handleOpenExternal(server)}
                size="sm"
                variant="outline"
                className="w-full mt-3 text-xs border-border hover:bg-secondary"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Open Server
              </Button>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground text-xs">No safe public servers found</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              NSFW or unsafe listings are automatically hidden.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
