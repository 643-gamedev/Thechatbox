import React, { useState, useRef } from 'react';
import UserProfilePopup from './UserProfilePopup';
import { FileText, Download } from 'lucide-react';

function FileAttachment({ message }) {
  const isImage = message.file_type?.startsWith('image/');
  const isVideo = message.file_type?.startsWith('video/');

  if (isImage) {
    return (
      <a href={message.file_url} target="_blank" rel="noopener noreferrer">
        <img
          src={message.file_url}
          alt={message.file_name}
          className="max-w-sm max-h-72 rounded object-cover mt-1 hover:opacity-90 transition-opacity"
        />
      </a>
    );
  }
  if (isVideo) {
    return <video src={message.file_url} controls className="max-w-sm max-h-56 rounded mt-1" />;
  }
  return (
    <a
      href={message.file_url}
      target="_blank"
      rel="noopener noreferrer"
      download={message.file_name}
      className="flex items-center gap-2 mt-1 px-3 py-2 border border-border rounded bg-secondary hover:bg-accent transition-colors text-xs max-w-xs"
    >
      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <span className="truncate flex-1">{message.file_name || 'file'}</span>
      <Download className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
    </a>
  );
}

function Avatar({ name }) {
  const initial = (name || '?')[0].toUpperCase();
  // Generate a consistent color from name
  const colors = ['#5865f2', '#eb459e', '#57f287', '#fee75c', '#ed4245', '#9b59b6'];
  const idx = (name || '').charCodeAt(0) % colors.length;
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
      style={{ background: colors[idx] }}
    >
      {initial}
    </div>
  );
}

// Groups consecutive messages from same author — pass grouped array
export default function DiscordStyleMessage({ message, isGrouped, currentUser }) {
  const [popupOpen, setPopupOpen] = useState(false);
  const nameRef = useRef(null);
  const hasFile = message.file_url && (message.message_type === 'file' || message.message_type === 'image');

  const timestamp = new Date(message.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date(message.created_date).toLocaleDateString();

  if (message.message_type === 'code') {
    return (
      <div className={`flex gap-3 px-4 ${isGrouped ? 'pt-0.5 pl-[4.5rem]' : 'pt-4'} hover:bg-white/5 group`}>
        {!isGrouped && <Avatar name={message.author_name} />}
        <div className="flex-1 min-w-0">
          {!isGrouped && (
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-sm font-semibold text-foreground">{message.author_name}</span>
              <span className="text-[10px] text-muted-foreground">{dateStr} {timestamp}</span>
            </div>
          )}
          <div className="border border-border bg-card rounded p-2 max-w-lg">
            <div className="text-[10px] text-muted-foreground mb-1">{message.code_language}</div>
            <pre className="text-xs text-foreground overflow-x-auto whitespace-pre-wrap">{message.content}</pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 px-4 ${isGrouped ? 'pt-0.5' : 'pt-4'} hover:bg-white/5 group`}>
      {/* Avatar or spacer */}
      {isGrouped ? (
        <div className="w-10 flex-shrink-0 flex items-center justify-center">
          <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            {timestamp}
          </span>
        </div>
      ) : (
        <div ref={nameRef} className="relative flex-shrink-0">
          <button onClick={() => setPopupOpen(v => !v)} className="focus:outline-none">
            <Avatar name={message.author_name} />
          </button>
          {popupOpen && (
            <UserProfilePopup
              authorEmail={message.author_email}
              authorName={message.author_name}
              onClose={() => setPopupOpen(false)}
            />
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        {!isGrouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <button
              onClick={() => setPopupOpen(v => !v)}
              className="text-sm font-semibold text-foreground hover:underline focus:outline-none"
            >
              {message.author_name}
            </button>
            <span className="text-[10px] text-muted-foreground">{dateStr} {timestamp}</span>
          </div>
        )}
        {hasFile ? (
          <FileAttachment message={message} />
        ) : (
          <p className="text-sm text-foreground break-words leading-relaxed">{message.content}</p>
        )}
      </div>
    </div>
  );
}