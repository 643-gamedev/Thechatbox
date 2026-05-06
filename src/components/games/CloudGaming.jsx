import React from 'react';
import { ExternalLink, Gamepad2 } from 'lucide-react';

const SERVICES = [
  {
    name: 'GeForce NOW',
    desc: 'Stream your Steam, Epic & Xbox games at RTX quality. Free tier available.',
    url: 'https://play.geforcenow.com',
    label: 'NVIDIA',
    color: '#76b900',
  },
  {
    name: 'Xbox Cloud Gaming',
    desc: 'Stream 100+ Game Pass games in your browser. Requires Game Pass Ultimate.',
    url: 'https://www.xbox.com/play',
    label: 'Microsoft',
    color: '#107c10',
  },
  {
    name: 'Boosteroid',
    desc: 'Stream PC games including PlayStation exclusives. Subscription based.',
    url: 'https://boosteroid.com',
    label: 'Boosteroid',
    color: '#e84040',
  },
  {
    name: 'Amazon Luna',
    desc: 'Cloud gaming by Amazon. Play on any device via browser.',
    url: 'https://luna.amazon.com',
    label: 'Amazon',
    color: '#ff9900',
  },
];

export default function CloudGaming() {
  return (
    <div className="w-full h-full flex flex-col overflow-auto p-6">
      <div className="max-w-xl mx-auto w-full space-y-4">
        <div className="space-y-1 mb-6">
          <h2 className="text-sm font-bold glow tracking-widest flex items-center gap-2">
            <Gamepad2 className="w-4 h-4" />
            CLOUD GAMING
          </h2>
          <p className="text-[10px] text-muted-foreground">
            // cloud gaming services block iframe embedding for security reasons — open them in a new tab below
          </p>
        </div>

        {SERVICES.map(s => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-4 p-4 border border-border rounded bg-card hover:bg-secondary transition-colors group block"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-bold" style={{ color: s.color }}>{s.name}</p>
              <p className="text-[10px] text-muted-foreground">{s.desc}</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
          </a>
        ))}

        <p className="text-[9px] text-muted-foreground text-center pt-2">
          // these services run games on remote servers and stream them to your browser — no downloads needed
        </p>
      </div>
    </div>
  );
}