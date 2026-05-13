import React, { useState, useEffect, useRef } from 'react';

const GRID = 20;
const SIZE = 18;
const TICK = 120;

const rand = () => Math.floor(Math.random() * GRID);
const newFood = () => ({ x: rand(), y: rand() });

export default function Snake() {
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [dir, setDir] = useState({ x: 1, y: 0 });
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);
  const dirRef = useRef(dir);
  dirRef.current = dir;

  const reset = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDir({ x: 1, y: 0 });
    setFood({ x: 5, y: 5 });
    setScore(0);
    setDead(false);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
      const d = dirRef.current;
      if (e.key === 'ArrowUp' && d.y === 0) setDir({ x: 0, y: -1 });
      if (e.key === 'ArrowDown' && d.y === 0) setDir({ x: 0, y: 1 });
      if (e.key === 'ArrowLeft' && d.x === 0) setDir({ x: -1, y: 0 });
      if (e.key === 'ArrowRight' && d.x === 0) setDir({ x: 1, y: 0 });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (dead) return;
    const id = setInterval(() => {
      setSnake(prev => {
        const head = { x: prev[0].x + dirRef.current.x, y: prev[0].y + dirRef.current.y };
        if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) { setDead(true); return prev; }
        if (prev.some(s => s.x === head.x && s.y === head.y)) { setDead(true); return prev; }
        const ate = head.x === food.x && head.y === food.y;
        if (ate) { setScore(s => s + 1); setFood(newFood()); }
        return ate ? [head, ...prev] : [head, ...prev.slice(0, -1)];
      });
    }, TICK);
    return () => clearInterval(id);
  }, [dead, food]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span>SCORE: <span className="text-foreground glow-subtle">{score}</span></span>
        <span className="text-[10px]">Arrow keys to move</span>
      </div>
      <div
        className="border border-border relative"
        style={{ width: GRID * SIZE, height: GRID * SIZE, background: '#050a05' }}
      >
        {/* Grid dots */}
        {Array.from({ length: GRID }).map((_, y) =>
          Array.from({ length: GRID }).map((_, x) => (
            <div key={`${x}-${y}`} style={{
              position: 'absolute', left: x * SIZE + SIZE / 2 - 1, top: y * SIZE + SIZE / 2 - 1,
              width: 2, height: 2, background: '#39FF1411', borderRadius: '50%'
            }} />
          ))
        )}
        {/* Food */}
        <div style={{
          position: 'absolute', left: food.x * SIZE + 2, top: food.y * SIZE + 2,
          width: SIZE - 4, height: SIZE - 4, background: '#39FF14',
          boxShadow: '0 0 8px #39FF14', borderRadius: 2
        }} />
        {/* Snake */}
        {snake.map((s, i) => (
          <div key={i} style={{
            position: 'absolute', left: s.x * SIZE + 1, top: s.y * SIZE + 1,
            width: SIZE - 2, height: SIZE - 2,
            background: i === 0 ? '#39FF14' : '#1a5c0a',
            boxShadow: i === 0 ? '0 0 6px #39FF1488' : 'none',
            borderRadius: 2
          }} />
        ))}
        {dead && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
            <p className="text-sm glow mb-1">GAME OVER</p>
            <p className="text-xs text-muted-foreground mb-3">score: {score}</p>
            <button onClick={reset} className="text-xs border border-border px-3 py-1 hover:bg-secondary">
              $ restart
            </button>
          </div>
        )}
      </div>
      {/* Mobile controls */}
      <div className="grid grid-cols-3 gap-1 mt-2 md:hidden">
        {[['↑', () => setDir(d => d.y === 0 ? { x: 0, y: -1 } : d)],
          ['←', () => setDir(d => d.x === 0 ? { x: -1, y: 0 } : d)],
          ['↓', () => setDir(d => d.y === 0 ? { x: 0, y: 1 } : d)],
          ['→', () => setDir(d => d.x === 0 ? { x: 1, y: 0 } : d)]
        ].map(([label, fn], i) => (
          <button key={i} onTouchStart={fn} className={`border border-border p-2 text-xs hover:bg-secondary ${label === '↑' ? 'col-start-2' : ''}`}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
