
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Hash, Code, Terminal, ArrowRight } from 'lucide-react';

export default function Home() {
  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: () => db.entities.Channel.list(),
  });

  const textChannels = channels.filter(c => c.category === 'text' || !c.category);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Logo */}
        <div className="space-y-2">
          <p className="text-6xl">🦦</p>
          <h1 className="text-2xl font-bold glow tracking-widest">STOAT.DEV</h1>
          <p className="text-xs text-muted-foreground">// chat platform for developers</p>
          <div className="h-px bg-border w-48 mx-auto mt-4" />
        </div>

        {/* Quick access */}
        <div className="space-y-3 text-left">
          <p className="text-[10px] tracking-widest text-muted-foreground px-1">QUICK ACCESS</p>

          {textChannels.length > 0 && (
            <Link to={`/chat/${textChannels[0].id}`}>
              <div className="flex items-center gap-3 p-3 rounded border border-border hover:bg-secondary transition-colors group">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs">#{textChannels[0].name}</p>
                  <p className="text-[10px] text-muted-foreground">Jump into chat</p>
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          )}

          <Link to="/code-editor">
            <div className="flex items-center gap-3 p-3 rounded border border-border hover:bg-secondary transition-colors group mt-2">
              <Code className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs">Code Editor</p>
                <p className="text-[10px] text-muted-foreground">Python, JS, C++, C, Rust & more</p>
              </div>
              <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </Link>

          <Link to="/terminal">
            <div className="flex items-center gap-3 p-3 rounded border border-border hover:bg-secondary transition-colors group mt-2">
              <Terminal className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs">Terminal</p>
                <p className="text-[10px] text-muted-foreground">Simulated Linux shell</p>
              </div>
              <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div className="pt-4 space-y-1">
          <p className="text-[10px] text-muted-foreground">$ echo "built for chromebook devs"</p>
          <p className="text-[10px] text-muted-foreground">powered by caffeine && stoats 🦦</p>
        </div>
      </div>
    </div>
  );
}