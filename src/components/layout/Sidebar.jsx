
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Hash, Code, Terminal, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useQueryClient } from '@tanstack/react-query';

const categoryIcons = {
  text: Hash,
  code: Code,
  terminal: Terminal,
};

export default function Sidebar({ channels, currentChannelId }) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', description: '', category: 'text' });
  const [expanded, setExpanded] = useState({ text: true, code: true, terminal: true });

  const grouped = {
    text: channels.filter(c => c.category === 'text' || !c.category),
    code: channels.filter(c => c.category === 'code'),
    terminal: channels.filter(c => c.category === 'terminal'),
  };

  const handleCreate = async () => {
    if (!newChannel.name.trim()) return;
    await db.entities.Channel.create(newChannel);
    queryClient.invalidateQueries({ queryKey: ['channels'] });
    setNewChannel({ name: '', description: '', category: 'text' });
    setOpen(false);
  };

  const groupLabels = { text: 'TEXT CHANNELS', code: 'CODE ROOMS', terminal: 'TERMINALS' };

  return (
    <div className="w-60 h-full bg-card border-r border-border flex flex-col glow-border">
      {/* Server header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xl glow">🦦</span>
          <h1 className="text-sm font-bold glow tracking-wider">STOAT.DEV</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1">// developer chat</p>
      </div>

      {/* Navigation */}
      <div className="px-2 py-3 border-b border-border space-y-1">
        <Link to="/code-editor">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs hover:bg-secondary transition-colors ${location.pathname === '/code-editor' ? 'bg-secondary glow-subtle' : 'text-muted-foreground'}`}>
            <Code className="w-3.5 h-3.5" />
            <span>Code Editor</span>
          </div>
        </Link>
        <Link to="/terminal">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs hover:bg-secondary transition-colors ${location.pathname === '/terminal' ? 'bg-secondary glow-subtle' : 'text-muted-foreground'}`}>
            <Terminal className="w-3.5 h-3.5" />
            <span>Terminal</span>
          </div>
        </Link>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-3">
        {Object.entries(grouped).map(([cat, chans]) => {
          const Icon = categoryIcons[cat];
          return (
            <div key={cat}>
              <button
                onClick={() => setExpanded(p => ({ ...p, [cat]: !p[cat] }))}
                className="flex items-center gap-1 px-2 text-[10px] tracking-widest text-muted-foreground hover:text-foreground w-full"
              >
                {expanded[cat] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {groupLabels[cat]}
              </button>
              {expanded[cat] && (
                <div className="mt-1 space-y-0.5">
                  {chans.map(ch => (
                    <Link key={ch.id} to={`/chat/${ch.id}`}>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded text-xs transition-colors ${currentChannelId === ch.id ? 'bg-secondary text-foreground glow-subtle' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{ch.name}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Channel */}
      <div className="p-3 border-t border-border">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full text-xs gap-1 border-border hover:bg-secondary">
              <Plus className="w-3 h-3" /> New Channel
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="glow-subtle text-sm">// create channel</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="channel-name"
                value={newChannel.name}
                onChange={e => setNewChannel(p => ({ ...p, name: e.target.value }))}
                className="bg-background border-border text-xs"
              />
              <Input
                placeholder="description (optional)"
                value={newChannel.description}
                onChange={e => setNewChannel(p => ({ ...p, description: e.target.value }))}
                className="bg-background border-border text-xs"
              />
              <Select value={newChannel.category} onValueChange={v => setNewChannel(p => ({ ...p, category: v }))}>
                <SelectTrigger className="bg-background border-border text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="text">Text Channel</SelectItem>
                  <SelectItem value="code">Code Room</SelectItem>
                  <SelectItem value="terminal">Terminal</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleCreate} className="w-full text-xs">
                $ create --channel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
