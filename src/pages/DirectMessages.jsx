
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useUser } from '@/lib/UserContext';
import { Phone, Send, ArrowLeft, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLayout } from '@/lib/LayoutContext';
import DMCallOverlay from '@/components/dm/DMCallOverlay';

function convId(a, b) {
  return [a, b].sort().join(':');
}

export default function DirectMessages() {
  const { currentUser, isGuest } = useUser();
  const { chatLayout } = useLayout();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const myEmail = currentUser?.email;
  const myName = currentUser?.full_name || currentUser?.email?.split('@')[0] || 'User';

  // Who we're chatting with — from URL ?with=email&name=name
  const [withEmail, setWithEmail] = useState(searchParams.get('with') || '');
  const [withName, setWithName] = useState(searchParams.get('name') || '');

  const [input, setInput] = useState('');
  const [inCall, setInCall] = useState(false);
  const bottomRef = useRef(null);

  const cid = withEmail ? convId(myEmail, withEmail) : null;

  // My friend requests (incoming pending)
  const { data: incomingRequests = [] } = useQuery({
    queryKey: ['friend-requests-in', myEmail],
    queryFn: () => db.entities.FriendRequest.filter({ to_email: myEmail, status: 'pending' }),
    enabled: !!myEmail && !isGuest,
    refetchInterval: 5000,
  });

  // Friends list (accepted requests involving me)
  const { data: acceptedFrom = [] } = useQuery({
    queryKey: ['friends-from', myEmail],
    queryFn: () => db.entities.FriendRequest.filter({ from_email: myEmail, status: 'accepted' }),
    enabled: !!myEmail && !isGuest,
  });
  const { data: acceptedTo = [] } = useQuery({
    queryKey: ['friends-to', myEmail],
    queryFn: () => db.entities.FriendRequest.filter({ to_email: myEmail, status: 'accepted' }),
    enabled: !!myEmail && !isGuest,
  });

  const friends = [
    ...acceptedFrom.map(r => ({ email: r.to_email, name: r.to_name || r.to_email.split('@')[0] })),
    ...acceptedTo.map(r => ({ email: r.from_email, name: r.from_name || r.from_email.split('@')[0] })),
  ];

  // Messages for current conversation
  const { data: messages = [] } = useQuery({
    queryKey: ['dm', cid],
    queryFn: () => db.entities.DirectMessage.filter({ conversation_id: cid }, 'created_date', 100),
    enabled: !!cid,
    refetchInterval: 2000,
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !cid) return;
    await db.entities.DirectMessage.create({
      conversation_id: cid,
      from_email: myEmail,
      from_name: myName,
      content: input.trim(),
    });
    setInput('');
    queryClient.invalidateQueries({ queryKey: ['dm', cid] });
  };

  const acceptRequest = async (req) => {
    await db.entities.FriendRequest.update(req.id, { status: 'accepted' });
    queryClient.invalidateQueries({ queryKey: ['friend-requests-in', myEmail] });
    queryClient.invalidateQueries({ queryKey: ['friends-to', myEmail] });
  };

  const declineRequest = async (req) => {
    await db.entities.FriendRequest.update(req.id, { status: 'declined' });
    queryClient.invalidateQueries({ queryKey: ['friend-requests-in', myEmail] });
  };

  const openConvo = (email, name) => {
    setWithEmail(email);
    setWithName(name);
    navigate(`/dm?with=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`, { replace: true });
  };

  if (isGuest) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Login required to use Direct Messages</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-52 border-r border-border bg-card flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-border">
          <p className="text-[10px] tracking-widest text-muted-foreground">DIRECT MESSAGES</p>
        </div>

        {/* Incoming requests */}
        {incomingRequests.length > 0 && (
          <div className="border-b border-border p-2 space-y-1">
            <p className="text-[9px] tracking-widest text-muted-foreground px-1">FRIEND REQUESTS</p>
            {incomingRequests.map(req => (
              <div key={req.id} className="flex items-center gap-1 px-1 py-1 rounded bg-secondary/50">
                <span className="text-[10px] flex-1 truncate">{req.from_name || req.from_email.split('@')[0]}</span>
                <button onClick={() => acceptRequest(req)} className="text-primary hover:opacity-70">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => declineRequest(req)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Friends / conversations */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <p className="text-[9px] tracking-widest text-muted-foreground px-1 mb-1">FRIENDS</p>
          {friends.length === 0 && (
            <p className="text-[9px] text-muted-foreground px-1">No friends yet. Click a user's name in chat to add them.</p>
          )}
          {friends.map(f => (
            <button
              key={f.email}
              onClick={() => openConvo(f.email, f.name)}
              className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                withEmail === f.email ? 'bg-secondary text-foreground glow-subtle' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-[9px] flex-shrink-0">
                {f.name[0]?.toUpperCase()}
              </div>
              <span className="truncate">{f.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat pane */}
      {withEmail ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-12 border-b border-border flex items-center px-4 gap-2 bg-card flex-shrink-0">
            <button onClick={() => { setWithEmail(''); setWithName(''); }} className="md:hidden">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-[10px]">
              {withName[0]?.toUpperCase()}
            </div>
            <span className="text-sm font-bold glow-subtle">{withName}</span>
            <span className="text-[10px] text-muted-foreground">{withEmail}</span>
            <button
              onClick={() => setInCall(true)}
              className="ml-auto p-1.5 rounded border border-border hover:bg-secondary transition-colors"
              title="Start voice call"
            >
              <Phone className="w-4 h-4" style={{ color: '#39FF14' }} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-3 space-y-1">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-[10px] text-muted-foreground">// send the first message</p>
              </div>
            )}
            {messages.map(msg => {
              const isOwn = msg.from_email === myEmail;
              if (chatLayout === 'discord') {
                return (
                  <div key={msg.id} className={`flex flex-col px-4 py-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-muted-foreground mb-0.5">{msg.from_name}</span>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs break-words ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-secondary border border-border text-foreground'}`}>
                      {msg.content}
                    </div>
                  </div>
                );
              }
              return (
                <div key={msg.id} className="px-4 py-0.5 text-xs">
                  <span style={{ color: '#39FF1488' }}>[</span>
                  <span style={{ color: '#39FF14' }}>{msg.from_name}</span>
                  <span style={{ color: '#39FF1488' }}>]</span>
                  <span className="text-muted-foreground mx-1">$</span>
                  <span className="text-foreground break-all">{msg.content}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 flex gap-2 bg-card flex-shrink-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={`Message ${withName}...`}
              className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-xs outline-none focus:border-primary"
            />
            <Button size="sm" onClick={sendMessage} className="text-xs px-3">
              <Send className="w-3 h-3" />
            </Button>
          </div>

          {/* P2P call overlay */}
          {inCall && (
            <DMCallOverlay
              myEmail={myEmail}
              myName={myName}
              peerEmail={withEmail}
              peerName={withName}
              onClose={() => setInCall(false)}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-2xl">💬</p>
            <p className="text-xs text-muted-foreground">Select a friend to start chatting</p>
            <p className="text-[10px] text-muted-foreground">// click a username in any chat to add friends</p>
          </div>
        </div>
      )}
    </div>
  );
}
