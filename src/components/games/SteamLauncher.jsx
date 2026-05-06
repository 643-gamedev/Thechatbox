import React from 'react';
import { ExternalLink, Gamepad2 } from 'lucide-react';

const FREE_GAMES = [
  { name: 'Counter-Strike 2', appId: 730, genre: 'FPS', desc: 'The iconic tactical shooter. Free to play.' },
  { name: 'Team Fortress 2', appId: 440, genre: 'FPS', desc: 'Class-based multiplayer shooter with hats.' },
  { name: 'Dota 2', appId: 570, genre: 'MOBA', desc: 'The legendary 5v5 strategy battle arena.' },
  { name: 'Warframe', appId: 230410, genre: 'Action', desc: 'Space ninja co-op looter shooter.' },
  { name: 'Path of Exile', appId: 238960, genre: 'RPG', desc: 'Deep action RPG with endless build variety.' },
  { name: 'Apex Legends', appId: 1172470, genre: 'Battle Royale', desc: 'Fast-paced hero battle royale.' },
  { name: 'Destiny 2', appId: 1085660, genre: 'FPS', desc: 'Epic sci-fi looter shooter MMO.' },
  { name: 'Lost Ark', appId: 1599340, genre: 'ARPG', desc: 'Massive free-to-play ARPG MMO.' },
  { name: 'Genshin Impact', appId: 1971870, genre: 'RPG', desc: 'Open-world action RPG gacha game.' },
  { name: 'Rocket League', appId: 252950, genre: 'Sports', desc: 'Soccer with rocket-powered cars.' },
  { name: 'War Thunder', appId: 236390, genre: 'Sim', desc: 'Military vehicles combat — tanks, planes, ships.' },
  { name: 'Brawlhalla', appId: 291550, genre: 'Fighting', desc: 'Free platform fighting game.' },
];

const GENRE_COLORS = {
  FPS: '#39FF14',
  MOBA: '#00bfff',
  Action: '#ff6b35',
  RPG: '#a855f7',
  ARPG: '#f59e0b',
  'Battle Royale': '#ef4444',
  Sports: '#22d3ee',
  Sim: '#94a3b8',
  Fighting: '#ec4899',
};

export default function SteamLauncher() {
  const handleLaunch = (appId) => {
    window.location.href = `steam://run/${appId}`;
  };

  const handleStore = (appId) => {
    window.open(`https://store.steampowered.com/app/${appId}`, '_blank');
  };

  return (
    <div className="w-full h-full flex flex-col overflow-auto p-4">
      <div className="max-w-2xl mx-auto w-full space-y-3">
        <div className="space-y-1 mb-4">
          <h2 className="text-sm font-bold glow tracking-widest flex items-center gap-2">
            <Gamepad2 className="w-4 h-4" />
            STEAM FREE-TO-PLAY
          </h2>
          <p className="text-[10px] text-muted-foreground">
            // click "LAUNCH" to open in Steam (requires Steam installed) · "STORE" to view the game page
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {FREE_GAMES.map(g => (
            <div
              key={g.appId}
              className="flex items-center gap-3 p-3 border border-border rounded bg-card hover:bg-secondary transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-xs font-bold truncate">{g.name}</p>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded border flex-shrink-0"
                    style={{ color: GENRE_COLORS[g.genre] || '#39FF14', borderColor: (GENRE_COLORS[g.genre] || '#39FF14') + '44' }}
                  >
                    {g.genre}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{g.desc}</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleStore(g.appId)}
                  className="text-[10px] px-2 py-1 rounded border border-border hover:bg-background transition-colors text-muted-foreground flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  STORE
                </button>
                <button
                  onClick={() => handleLaunch(g.appId)}
                  className="text-[10px] px-3 py-1 rounded border font-bold transition-colors"
                  style={{ borderColor: '#39FF14', color: '#39FF14', background: '#39FF1411' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#39FF1422'}
                  onMouseLeave={e => e.currentTarget.style.background = '#39FF1411'}
                >
                  LAUNCH
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[9px] text-muted-foreground text-center pt-2">
          // all games are free-to-play on Steam · "LAUNCH" opens Steam directly if installed on your PC
        </p>
      </div>
    </div>
  );
}