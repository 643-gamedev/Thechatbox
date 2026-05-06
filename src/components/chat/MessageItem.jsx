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
          className="max-w-xs max-h-64 rounded border border-border object-cover mt-1 hover:opacity-90 transition-opacity"
        />
      </a>
    );
  }

  if (isVideo) {
    return (
      <video
        src={message.file_url}
        controls
        className="max-w-xs max-h-48 rounded border border-border mt-1"
      />
    );
  }

  // Generic file
  return (
    <a
      href={message.file_url}
      target="_blank"
      rel="noopener noreferrer"
      download={message.file_name}
      className="flex items-center gap-2 mt-1 px-3 py-2 border border-border rounded bg-background hover:bg-secondary transition-colors text-xs max-w-xs"
    >
      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <span className="truncate flex-1">{message.file_name || 'file'}</span>
      <Download className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
    </a>
  );
}

export default function MessageItem({ message, currentUser, layout = 'terminal' }) {
  const myEmail = currentUser?.email || currentUser?.guest_id;
  const isOwn = message.author_email === myEmail;
  const isDiscord = layout === 'discord';
  const [popupOpen, setPopupOpen] = useState(false);
  const nameRef = useRef(null);
  const hasFile = message.file_url && (message.message_type === 'file' || message.message_type === 'image');

  const AuthorName = ({ className, style }) => (
    <span className={`relative ${className}`} ref={nameRef}>
      <button
        onClick={() => setPopupOpen(v => !v)}
        className="hover:underline cursor-pointer focus:outline-none"
        style={style}
      >
        {message.author_name}
      </button>
      {popupOpen && (
        <UserProfilePopup
          authorEmail={message.author_email}
          authorName={message.author_name}
          onClose={() => setPopupOpen(false)}
        />
      )}
    </span>
  );

  if (message.message_type === 'code') {
    return (
      <div className={`flex flex-col px-4 py-1 ${isOwn ? 'items-end' : 'items-start'}`}>
        <span className="text-[10px] text-muted-foreground mb-1">
          <AuthorName style={isDiscord ? {} : { color: '#39FF14' }} />
        </span>
        <div className="max-w-[80%] border border-border bg-card rounded p-2">
          <div className="text-[10px] text-muted-foreground mb-1">{message.code_language}</div>
          <pre className="text-xs text-foreground overflow-x-auto whitespace-pre-wrap">{message.content}</pre>
        </div>
      </div>
    );
  }

  if (isDiscord) {
    return (
      <div className={`flex flex-col px-4 py-1 ${isOwn ? 'items-end' : 'items-start'}`}>
        <span className="text-[10px] text-muted-foreground mb-1">
          <AuthorName />
        </span>
        <div className={`max-w-[75%] ${hasFile ? '' : 'px-3 py-2 rounded-2xl'} text-xs break-words ${!hasFile ? (isOwn ? 'bg-primary text-primary-foreground' : 'bg-secondary border border-border text-foreground') : ''}`}>
          {hasFile ? <FileAttachment message={message} /> : message.content}
        </div>
      </div>
    );
  }

  // Terminal layout
  return (
    <div className="px-4 py-0.5 text-xs">
      <span style={{ color: '#39FF1488' }}>[</span>
      <AuthorName style={{ color: '#39FF14' }} />
      <span style={{ color: '#39FF1488' }}>]</span>
      <span className="text-muted-foreground mx-1">$</span>
      {hasFile ? (
        <span className="inline-block mt-1"><FileAttachment message={message} /></span>
      ) : (
        <span className="text-foreground break-all">{message.content}</span>
      )}
    </div>
  );
}