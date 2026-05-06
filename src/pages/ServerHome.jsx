import db from '@/api/chatboxClient';


import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Hash, Code, Terminal, ArrowRight } from 'lucide-react';

export default function ServerHome() {
  const { serverId } = useParams();
  const effectiveServerId = serverId || 'main';

  const { data: channels = [] } = useQuery({
    queryKey: ['channels', effectiveServerId],
    queryFn: () => db.entities.Channel.filter({ server_id: effectiveServerId }),
  });

  const { data: allServers = [] } = useQuery({
    queryKey: ['servers'],
    queryFn: () => db.entities.Server.list(),
  });

  const server = effectiveServerId === 'main'
    ? { name: 'THECHATBOX', icon: '🦦', is_main: true }
    : allServers.find(s => s.id === effectiveServerId);

  const firstTextChannel = channels.find(c => c.category === 'text' || !c.category);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-md w-full space-y-6 text-center">
        <div>
          <p className="text-5xl mb-2">{server?.icon || '🦦'}</p>
          <h1 className="text-xl font-bold glow tracking-widest">{server?.name || 'Server'}</h1>
          <p className="text-[10px] text-muted-foreground mt-1">
            {server?.description || '// select a channel to start'}
          </p>
          <div className="h-px bg-border w-32 mx-auto mt-4" />
        </div>

        <div className="space-y-2 text-left">
          <p className="text-[10px] tracking-widest text-muted-foreground px-1">CHANNELS ({channels.length})</p>
          {channels.slice(0, 5).map(ch => {
            const Icon = ch.category === 'code' ? Code : ch.category === 'terminal' ? Terminal : Hash;
            return (
              <Link key={ch.id} to={`/server/${effectiveServerId}/chat/${ch.id}`}>
                <div className="flex items-center gap-3 p-3 rounded border border-border hover:bg-secondary transition-colors group">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs">#{ch.name}</p>
                    {ch.description && <p className="text-[10px] text-muted-foreground">{ch.description}</p>}
                  </div>
                  <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
                </div>
              </Link>
            );
          })}
          {channels.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No channels yet</p>
          )}
        </div>
      </div>
    </div>
  );
}