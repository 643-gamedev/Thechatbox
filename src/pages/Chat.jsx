
import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import MessageItem from '@/components/chat/MessageItem';
import DiscordStyleMessage from '@/components/chat/DiscordStyleMessage';
import MessageInput from '@/components/chat/MessageInput';
import { Hash } from 'lucide-react';
import { useUser } from '@/lib/UserContext';
import { useLayout } from '@/lib/LayoutContext';

export default function Chat() {
  const { serverId, channelId } = useParams();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const { currentUser, isGuest } = useUser();
  const { chatLayout } = useLayout();

  const { data: channels = [] } = useQuery({
    queryKey: ['channels', serverId || 'main'],
    queryFn: () => db.entities.Channel.filter({ server_id: serverId || 'main' }),
  });

  const channel = channels.find(c => c.id === channelId);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', channelId],
    queryFn: () => db.entities.Message.filter({ channel_id: channelId }, 'created_date', 100),
    enabled: !!channelId,
    refetchInterval: 3000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (msgData) => {
    const displayName = isGuest
      ? currentUser?.display_name
      : (currentUser?.full_name || currentUser?.email);
    await db.entities.Message.create({
      ...msgData,
      channel_id: channelId,
      author_name: displayName || 'anonymous',
      author_email: currentUser?.email || currentUser?.guest_id || 'guest',
    });
    queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
  };

  if (!channelId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-4xl">🦦</p>
          <p className="text-sm glow">Thechatbox</p>
          <p className="text-xs text-muted-foreground">Select a channel to begin</p>
          <p className="text-[10px] text-muted-foreground">$ echo "hello, developer"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Channel header */}
      <div className="h-12 border-b border-border flex items-center px-4 gap-2 bg-card flex-shrink-0">
        <Hash className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-bold glow-subtle">{channel?.name || '...'}</span>
        {channel?.description && (
          <>
            <span className="text-muted-foreground text-xs">|</span>
            <span className="text-xs text-muted-foreground truncate">{channel.description}</span>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-muted-foreground">loading<span className="cursor-blink">_</span></span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">No messages yet in #{channel?.name}</p>
              <p className="text-[10px] text-muted-foreground">$ echo "be the first"</p>
            </div>
          </div>
        ) : (
          chatLayout === 'classic' ? (
            messages.map((msg, idx) => {
              const prev = messages[idx - 1];
              const isGrouped = prev && prev.author_email === msg.author_email &&
                new Date(msg.created_date) - new Date(prev.created_date) < 5 * 60 * 1000;
              return <DiscordStyleMessage key={msg.id} message={msg} isGrouped={isGrouped} currentUser={currentUser} />;
            })
          ) : (
            messages.map(msg => <MessageItem key={msg.id} message={msg} currentUser={currentUser} layout={chatLayout} />)
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} />
    </div>
  );
}