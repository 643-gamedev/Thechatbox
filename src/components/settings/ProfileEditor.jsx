import db from '@/api/chatboxClient';


import React, { useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useUser } from '@/lib/UserContext';

export default function ProfileEditor() {
  const { currentUser, refreshUser } = useUser();
  const [uploading, setUploading] = useState(false);
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [saving, setSaving] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await db.integrations.Core.UploadFile({ file });
    await db.auth.updateMe({ avatar_url: file_url });
    await refreshUser();
    setUploading(false);
  };

  const saveBio = async () => {
    setSaving(true);
    await db.auth.updateMe({ bio });
    await refreshUser();
    setSaving(false);
  };

  const avatarUrl = currentUser?.avatar_url;
  const initials = (currentUser?.full_name || currentUser?.email || '?')[0].toUpperCase();

  return (
    <div className="border border-border rounded p-4 bg-card space-y-4 mb-4">
      <p className="text-[10px] tracking-widest text-muted-foreground">PROFILE</p>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <div className="w-16 h-16 rounded-full border-2 border-border overflow-hidden flex items-center justify-center bg-secondary text-lg font-bold glow-subtle">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#39FF14' }} /> : <Camera className="w-4 h-4" style={{ color: '#39FF14' }} />}
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
          </label>
        </div>
        <div>
          <p className="text-xs font-bold">{currentUser?.full_name || currentUser?.email}</p>
          <p className="text-[10px] text-muted-foreground">{currentUser?.email}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">Hover avatar to change photo</p>
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground">BIO</label>
        <div className="flex gap-2">
          <input
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="// say something about yourself..."
            maxLength={100}
            className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-xs outline-none focus:border-primary"
          />
          <Button size="sm" className="text-xs" onClick={saveBio} disabled={saving}>
            {saving ? '...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}