
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUser } from '@/lib/UserContext';

const EMOJIS = ['🦦', '🐧', '🦊', '🐉', '🤖', '👾', '⚡', '🔥', '🛸', '🦄', '💻', '🧩'];

export default function CreateServerModal({ open, onClose, onCreated }) {
  const { currentUser } = useUser();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '', is_public: true, icon: '🦦' });
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    // Generate a unique invite token for private servers
    const inviteToken = !form.is_public
      ? Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
      : null;
    const server = await db.entities.Server.create({
      ...form,
      owner_email: currentUser.email,
      is_main: false,
      ...(inviteToken ? { invite_token: inviteToken } : {}),
    });
    // Create a default general channel
    await db.entities.Channel.create({
      name: 'general',
      description: 'General discussion',
      category: 'text',
      server_id: server.id,
    });
    queryClient.invalidateQueries({ queryKey: ['servers'] });
    setLoading(false);
    if (inviteToken) {
      const inviteUrl = `${window.location.origin}/app?invite=${inviteToken}`;
      navigator.clipboard.writeText(inviteUrl).catch(() => {});
      toast.success(`Server created! Invite link copied to clipboard → ${inviteUrl}`, { duration: 8000 });
    } else {
      toast.success(`Server "${form.name}" created!`);
    }
    onCreated(server);
    onClose();
    setForm({ name: '', description: '', is_public: true, icon: '🦦' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="glow-subtle text-sm tracking-wider">// create server</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Icon picker */}
          <div>
            <Label className="text-[10px] text-muted-foreground">ICON</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setForm(p => ({ ...p, icon: e }))}
                  className="text-xl w-9 h-9 flex items-center justify-center rounded border transition-all"
                  style={{
                    borderColor: form.icon === e ? '#39FF14' : '#39FF1433',
                    background: form.icon === e ? '#39FF1422' : 'transparent',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Input
              placeholder="server-name"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="bg-background border-border text-xs"
            />
            <Input
              placeholder="description (optional)"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="bg-background border-border text-xs"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Public Server</Label>
              <p className="text-[10px] text-muted-foreground">Visible in Discover</p>
            </div>
            <Switch
              checked={form.is_public}
              onCheckedChange={v => setForm(p => ({ ...p, is_public: v }))}
            />
          </div>

          {!form.is_public && (
            <p className="text-[10px] text-muted-foreground border border-border p-2 rounded">
              🔒 Private — only people with an invite link can join
            </p>
          )}

          <Button onClick={handleCreate} disabled={loading} className="w-full text-xs">
            {loading ? '$ creating...' : '$ create --server'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}