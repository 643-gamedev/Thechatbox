
import React, { useState, useRef } from 'react';
import { Send, Code, Paperclip, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LANGUAGES = ['python', 'javascript', 'cpp', 'c', 'bash', 'html', 'css', 'rust', 'go', 'java'];

export default function MessageInput({ onSend }) {
  const [content, setContent] = useState('');
  const [isCode, setIsCode] = useState(false);
  const [language, setLanguage] = useState('python');
  const [attachment, setAttachment] = useState(null); // { url, name, type }
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await db.integrations.Core.UploadFile({ file });
    setAttachment({ url: file_url, name: file.name, type: file.type });
    setUploading(false);
    e.target.value = '';
  };

  const handleSend = () => {
    if (!content.trim() && !attachment) return;

    if (attachment) {
      const isImage = attachment.type.startsWith('image/');
      const isVideo = attachment.type.startsWith('video/');
      onSend({
        content: content.trim() || attachment.name,
        message_type: isImage ? 'image' : 'file',
        file_url: attachment.url,
        file_name: attachment.name,
        file_type: attachment.type,
      });
      setAttachment(null);
      setContent('');
      return;
    }

    onSend({
      content: content.trim(),
      message_type: isCode ? 'code' : 'text',
      code_language: isCode ? language : undefined,
    });
    setContent('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border p-3 bg-card">
      {isCode && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-muted-foreground">LANG:</span>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-32 h-7 text-xs bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {LANGUAGES.map(l => (
                <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Attachment preview */}
      {attachment && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-background border border-border rounded text-xs">
          {attachment.type.startsWith('image/') ? (
            <img src={attachment.url} alt="" className="h-10 w-10 object-cover rounded" />
          ) : (
            <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className="flex-1 truncate text-muted-foreground">{attachment.name}</span>
          <button onClick={() => setAttachment(null)}>
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button
          variant={isCode ? 'default' : 'outline'}
          size="icon"
          className="h-8 w-8 flex-shrink-0 border-border"
          onClick={() => setIsCode(!isCode)}
          title="Toggle code mode"
        >
          <Code className="w-3.5 h-3.5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 flex-shrink-0 border-border"
          onClick={() => fileRef.current.click()}
          disabled={uploading}
          title="Attach file"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
        </Button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFile} accept="image/*,video/*,.pdf,.txt,.zip,.json,.md" />

        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={attachment ? 'Add a caption...' : isCode ? '// paste your code...' : '> type a message...'}
          className="min-h-[36px] max-h-32 text-xs bg-background border-border resize-none"
          rows={1}
        />
        <Button size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleSend}>
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}