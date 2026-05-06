
import React, { useState } from 'react';

import { useUser } from '@/lib/UserContext';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, UserPlus, Check, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function UserProfilePopup({ authorEmail, authorName, onClose }) {
  const { currentUser, isGuest } = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const myEmail = currentUser?.email;
  const myName = currentUser?.full_name || currentUser?.email?.split('@')[0] || 'User';

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Check existing friendship
  const { data: existingReqFrom = [] } = useQuery({
    queryKey: ['fr-check-from', myEmail, authorEmail],
    queryFn: () => db.entities.FriendRequest.filter({ from_email: myEmail, to_email: authorEmail }),
    enabled: !!myEmail && !isGuest && authorEmail !== myEmail,
  });
  const { data: existingReqTo = [] } = useQuery({
    queryKey: ['fr-check-to', myEmail, authorEmail],
    queryFn: () => db.entities.FriendRequest.filter({ from_email: authorEmail, to_email: myEmail }),
    enabled: !!myEmail && !isGuest && authorEmail !== myEmail,
  });

  // Don't show popup for own name or guests
  if (!myEmail || isGuest || authorEmail === myEmail) return null;

  const allReqs = [...existingReqFrom, ...existingReqTo];
  const accepted = allReqs.find(r => r.status === 'accepted');
  const pending = allReqs.find(r => r.status === 'pending');

  const sendFriendRequest = async () => {
    setSending(true);
    await db.entities.FriendRequest.create({
      from_email: myEmail,
      from_name: myName,
      to_email: authorEmail,
      to_name: authorName,
      status: 'pending',
    });
    queryClient.invalidateQueries({ queryKey: ['fr-check-from', myEmail, authorEmail] });
    setSent(true);
    setSending(false);
  };

  const openDM = () => {
    onClose();
    navigate(`/dm?with=${encodeURIComponent(authorEmail)}&name=${encodeURIComponent(authorName)}`);
  };

  return (
    <div className="absolute z-50 bg-card border border-border rounded shadow-lg p-3 w-48 space-y-2" style={{ top: '100%', left: 0 }}>
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-sm font-bold glow-subtle">
          {authorName[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-xs font-bold">{authorName}</p>
          <p className="text-[9px] text-muted-foreground truncate max-w-[90px]">{authorEmail}</p>
        </div>
      </div>

      {accepted ? (
        <button
          onClick={openDM}
          className="w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-secondary transition-colors"
        >
          <MessageCircle className="w-3 h-3" style={{ color: '#39FF14' }} />
          Send Message
        </button>
      ) : pending || sent ? (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-2 py-1.5">
          <Check className="w-3 h-3" />
          {sent || (pending?.from_email === myEmail) ? 'Request sent' : 'Wants to be friends'}
        </div>
      ) : (
        <button
          onClick={sendFriendRequest}
          disabled={sending}
          className="w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-secondary transition-colors"
        >
          <UserPlus className="w-3 h-3" style={{ color: '#39FF14' }} />
          {sending ? 'Sending...' : 'Add Friend'}
        </button>
      )}

      {accepted && (
        <button
          onClick={openDM}
          className="w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground"
        >
          <MessageCircle className="w-3 h-3" />
          Open DMs
        </button>
      )}

      <button onClick={onClose} className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-foreground">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}