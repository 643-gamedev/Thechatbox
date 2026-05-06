
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Search, Lock, Globe, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUser } from '@/lib/UserContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Discover() {
  const { currentUser, isGuest } = useUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: servers = [] } = useQuery({
    queryKey: ['public-servers'],
    queryFn: () => db.entities.Server.filter({ is_public: true }),
  });

  const filtered = servers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase())
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

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold glow tracking-widest mb-1">DISCOVER SERVERS</h1>
        <p className="text-xs text-muted-foreground">// find public developer communities</p>
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

            <Button
              onClick={() => handleJoin(server)}
              size="sm"
              variant="outline"
              className="w-full mt-3 text-xs border-border hover:bg-secondary"
            >
              $ join --server
            </Button>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground text-xs">No public servers found</p>
            <p className="text-[10px] text-muted-foreground mt-1">Be the first to create one!</p>
          </div>
        )}
      </div>
    </div>
  );
}