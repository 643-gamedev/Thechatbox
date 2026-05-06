import db from '@/api/chatboxClient';


import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Hash, Code, Terminal, Plus, ChevronDown, ChevronRight, Shield, Gamepad2, Mic, MessageCircle, Link as LinkIcon, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/lib/UserContext';

const categoryIcons = { text: Hash, code: Code, terminal: Terminal, voice: Mic };
const groupLabels = { text: 'TEXT CHANNELS', code: 'CODE ROOMS', terminal: 'TERMINALS', voice: 'VOICE CHANNELS' };

export default function ChannelSidebar({ server, channels }) {
  const { channelId } = useParams();
  const queryClient = useQueryClient();
  const { isMod, isGuest, currentUser } = useUser();
  const [open, setOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', description: '', category: 'text' });
  const [expanded, setExpanded] = useState({ text: true, code: true, terminal: true, voice: true });

  const isOwner = server && !isGuest && currentUser?.email === server.owner_email;
  const canManage = isMod || isOwner;

  const copyInviteLink = () => {
    const url = `${window.location.origin}?invite=${server.invite_token}`;
    navigator.clipboard.writeText(url);
    toast.success('Invite link copied!');
  };

  const grouped = {
    text: channels.filter(c => c.category === 'text' || !c.category),
    code: channels.filter(c => c.category === 'code'),
    terminal: channels.filter(c => c.category === 'terminal'),
    voice: channels.filter(c => c.category === 'voice'),
  };

  const handleCreate = async () => {
    if (!newChannel.name.trim()) return;
    await db.entities.Channel.create({
      ...newChannel,
      server_id: server?.id || 'main',
    });
    queryClient.invalidateQueries({ queryKey: ['channels', server?.id] });
    setNewChannel({ name: '', description: '', category: 'text' });
    setOpen(false);
  };

  return (
    <div className="w-56 h-full bg-card border-r border-border flex flex-col flex-shrink-0">
      {/* Server name header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">{server?.icon || '🦦'}</span>
          <div>
            <h2 className="text-xs font-bold glow-subtle tracking-wider truncate">{server?.name || 'THECHATBOX'}</h2>
            {server?.is_main && (
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground">Main Server</span>
              </div>
            )}
            {server && !server.is_main && !server.is_public && server.invite_token && isOwner && (
              <button
                onClick={copyInviteLink}
                className="flex items-center gap-1 mt-0.5 hover:opacity-80 transition-opacity"
                title="Copy invite link"
              >
                <LinkIcon className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground">Copy invite</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tool nav */}
      <div className="px-2 py-2 border-b border-border space-y-0.5">
        <Link to="/code-editor">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Code className="w-3.5 h-3.5" /><span>Code Editor</span>
          </div>
        </Link>
        <Link to="/terminal">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Terminal className="w-3.5 h-3.5" /><span>Terminal</span>
          </div>
        </Link>
        <Link to="/games">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Gamepad2 className="w-3.5 h-3.5" /><span>Games</span>
          </div>
        </Link>
        <Link to="/dm">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <MessageCircle className="w-3.5 h-3.5" /><span>Direct Messages</span>
          </div>
        </Link>
        <Link to="/phone">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Phone className="w-3.5 h-3.5" /><span>Phone</span>
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
                className="flex items-center gap-1 px-2 text-[10px] tracking-widest text-muted-foreground hover:text-foreground w-full mb-1"
              >
                {expanded[cat] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {groupLabels[cat]}
              </button>
              {expanded[cat] && (
                <div className="space-y-0.5">
                  {chans.map(ch => {
                    const path = ch.category === 'voice'
                      ? `/server/${server?.id || 'main'}/voice/${ch.id}`
                      : `/server/${server?.id || 'main'}/chat/${ch.id}`;
                    return (
                      <Link key={ch.id} to={path}>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded text-xs transition-colors ${
                          channelId === ch.id ? 'bg-secondary text-foreground glow-subtle' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}>
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{ch.name}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create channel — only for mods/owners */}
      {canManage && (
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
                <Input placeholder="channel-name" value={newChannel.name}
                  onChange={e => setNewChannel(p => ({ ...p, name: e.target.value }))}
                  className="bg-background border-border text-xs" />
                <Input placeholder="description (optional)" value={newChannel.description}
                  onChange={e => setNewChannel(p => ({ ...p, description: e.target.value }))}
                  className="bg-background border-border text-xs" />
                <Select value={newChannel.category} onValueChange={v => setNewChannel(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="bg-background border-border text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="text">Text Channel</SelectItem>
                    <SelectItem value="code">Code Room</SelectItem>
                    <SelectItem value="terminal">Terminal</SelectItem>
                    <SelectItem value="voice">Voice Channel</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleCreate} className="w-full text-xs">$ create --channel</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}