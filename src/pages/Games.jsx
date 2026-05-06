import React, { useState, useEffect } from 'react';
import Snake from '@/components/games/Snake';
import Minesweeper from '@/components/games/Minesweeper';
import Tetris from '@/components/games/Tetris';
import EaglercraftX from '@/components/games/EaglercraftX';
import GBAEmulator from '@/components/games/GBAEmulator';
import CloudGaming from '@/components/games/CloudGaming';
import SteamLauncher from '@/components/games/SteamLauncher';
import { Gamepad2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const GAMES = [
  { id: 'snake', name: 'Snake', desc: '// classic snake game' },
  { id: 'minesweeper', name: 'Minesweeper', desc: '// find the mines' },
  { id: 'tetris', name: 'Tetris', desc: '// block stacker' },
  { id: 'eaglercraft', name: 'EaglercraftX 1.8.8', desc: '// minecraft in the browser — WebGL' },
  { id: 'gba', name: 'GBA Emulator', desc: '// play your .gba ROMs in browser — gbajs3' },
  { id: 'cloud', name: 'Cloud Gaming', desc: '// GeForce NOW, Xbox, Boosteroid & more' },
  { id: 'steam', name: 'Steam F2P Launcher', desc: '// launch free-to-play Steam games directly' },
];

export default function Games() {
  const [active, setActive] = useState(null);
  const queryClient = useQueryClient();

  // Pause all background refetches while a game is active (except VC — those are
  // realtime subscriptions, not queries, so they're unaffected)
  useEffect(() => {
    if (active) {
      // Pause all queries globally
      queryClient.setDefaultOptions({ queries: { refetchInterval: false, refetchOnWindowFocus: false } });
    } else {
      // Restore defaults
      queryClient.setDefaultOptions({ queries: { refetchInterval: undefined, refetchOnWindowFocus: true } });
    }
    return () => {
      queryClient.setDefaultOptions({ queries: { refetchInterval: undefined, refetchOnWindowFocus: true } });
    };
  }, [active, queryClient]);

  const isFullscreen = active === 'eaglercraft' || active === 'gba' || active === 'cloud' || active === 'steam';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="h-12 border-b border-border flex items-center px-4 gap-2 bg-card flex-shrink-0">
        <Gamepad2 className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-bold glow-subtle">GAMES</span>
        {active && (
          <>
            <span className="text-muted-foreground text-xs">|</span>
            <span className="text-xs text-muted-foreground">{GAMES.find(g => g.id === active)?.name}</span>
            <button
              onClick={() => setActive(null)}
              className="ml-auto text-[10px] text-muted-foreground hover:text-foreground border border-border px-2 py-0.5 rounded"
            >
              ← back
            </button>
          </>
        )}
      </div>

      {/* Fullscreen games get all remaining height */}
      {isFullscreen ? (
        <div className="flex-1 overflow-hidden relative">
          {active === 'eaglercraft' && <EaglercraftX active={true} />}
          {active === 'gba' && <GBAEmulator />}
          {active === 'cloud' && <CloudGaming />}
          {active === 'steam' && <SteamLauncher />}
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          {!active && (
            <div className="max-w-md mx-auto space-y-3">
              <p className="text-[10px] tracking-widest text-muted-foreground mb-4">SELECT GAME</p>
              {GAMES.map(g => (
                <button
                  key={g.id}
                  onClick={() => setActive(g.id)}
                  className="w-full flex items-center gap-4 p-4 border border-border rounded bg-card hover:bg-secondary transition-colors text-left group"
                >
                  <Gamepad2 className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                  <div>
                    <p className="text-sm font-bold glow-subtle">{g.name}</p>
                    <p className="text-[10px] text-muted-foreground">{g.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {active === 'snake' && <Snake />}
          {active === 'minesweeper' && <Minesweeper />}
          {active === 'tetris' && <Tetris />}
        </div>
      )}
    </div>
  );
}