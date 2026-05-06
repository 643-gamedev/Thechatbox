import React from 'react';

export default function XboxCloud() {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-4 py-2 border-b border-border bg-card flex-shrink-0 space-y-1">
        <p className="text-[10px] text-muted-foreground">
          // <span style={{ color: '#39FF14' }}>Xbox Cloud Gaming</span> — requires Game Pass Ultimate subscription
        </p>
        <p className="text-[9px] text-muted-foreground">
          If the page asks to sign in, log in with your Microsoft account. Use Edge or Chrome for best compatibility.
        </p>
      </div>
      <iframe
        src="https://www.xbox.com/play"
        className="flex-1 w-full border-0"
        title="Xbox Cloud Gaming"
        allow="autoplay; microphone; gamepad; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}