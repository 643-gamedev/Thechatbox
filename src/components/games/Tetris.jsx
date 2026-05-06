import React, { useState, useEffect, useCallback, useRef } from 'react';

const COLS = 10, ROWS = 20, TICK = 500;

const PIECES = [
  { shape: [[1,1,1,1]], color: '#00ffff' },
  { shape: [[1,1],[1,1]], color: '#ffff00' },
  { shape: [[0,1,0],[1,1,1]], color: '#ff00ff' },
  { shape: [[1,0,0],[1,1,1]], color: '#ff8800' },
  { shape: [[0,0,1],[1,1,1]], color: '#0000ff' },
  { shape: [[0,1,1],[1,1,0]], color: '#00ff00' },
  { shape: [[1,1,0],[0,1,1]], color: '#ff0000' },
];

const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

function rotate(shape) {
  return shape[0].map((_, i) => shape.map(row => row[i]).reverse());
}

function randomPiece() {
  const p = PIECES[Math.floor(Math.random() * PIECES.length)];
  return { shape: p.shape, color: p.color, x: Math.floor(COLS / 2) - 1, y: 0 };
}

function fits(board, piece, dx = 0, dy = 0, shape = piece.shape) {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) {
        const nx = piece.x + c + dx, ny = piece.y + r + dy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
        if (ny >= 0 && board[ny][nx]) return false;
      }
  return true;
}

function place(board, piece) {
  const nb = board.map(r => [...r]);
  piece.shape.forEach((row, r) => row.forEach((v, c) => {
    if (v) nb[piece.y + r][piece.x + c] = piece.color;
  }));
  const cleared = nb.filter(row => row.every(Boolean));
  const kept = nb.filter(row => !row.every(Boolean));
  return { board: [...Array(cleared.length).fill(null).map(() => Array(COLS).fill(null)), ...kept], lines: cleared.length };
}

const CELL = 24;

export default function Tetris() {
  const [board, setBoard] = useState(emptyBoard());
  const [piece, setPiece] = useState(randomPiece());
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);
  const stateRef = useRef({ board, piece, dead });
  stateRef.current = { board, piece, dead };

  const drop = useCallback(() => {
    const { board, piece, dead } = stateRef.current;
    if (dead) return;
    if (fits(board, piece, 0, 1)) {
      setPiece(p => ({ ...p, y: p.y + 1 }));
    } else {
      const { board: nb, lines } = place(board, piece);
      setBoard(nb);
      setScore(s => s + lines * 100);
      const np = randomPiece();
      if (!fits(nb, np)) { setDead(true); return; }
      setPiece(np);
    }
  }, []);

  useEffect(() => {
    if (dead) return;
    const id = setInterval(drop, TICK);
    return () => clearInterval(id);
  }, [dead, drop]);

  useEffect(() => {
    const onKey = (e) => {
      const { board, piece, dead } = stateRef.current;
      if (dead) return;
      if (e.key === 'ArrowLeft' && fits(board, piece, -1)) setPiece(p => ({ ...p, x: p.x - 1 }));
      if (e.key === 'ArrowRight' && fits(board, piece, 1)) setPiece(p => ({ ...p, x: p.x + 1 }));
      if (e.key === 'ArrowDown') drop();
      if (e.key === 'ArrowUp') {
        const r = rotate(piece.shape);
        if (fits(board, piece, 0, 0, r)) setPiece(p => ({ ...p, shape: r }));
      }
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drop]);

  const reset = () => { setBoard(emptyBoard()); setPiece(randomPiece()); setScore(0); setDead(false); };

  // Ghost piece
  let ghostY = piece.y;
  while (fits(board, { ...piece, y: ghostY + 1 })) ghostY++;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span>SCORE: <span className="text-foreground glow-subtle">{score}</span></span>
        <span className="text-[10px]">Arrows to move, ↑ to rotate</span>
      </div>
      <div className="border border-border relative" style={{ width: COLS * CELL, height: ROWS * CELL, background: '#050a05' }}>
        {/* Board cells */}
        {board.map((row, r) => row.map((color, c) => color ? (
          <div key={`${r}-${c}`} style={{
            position: 'absolute', left: c * CELL + 1, top: r * CELL + 1,
            width: CELL - 2, height: CELL - 2, background: color, opacity: 0.9, borderRadius: 1
          }} />
        ) : null))}
        {/* Ghost */}
        {piece.shape.map((row, r) => row.map((v, c) => v && ghostY !== piece.y ? (
          <div key={`g${r}-${c}`} style={{
            position: 'absolute', left: (piece.x + c) * CELL + 1, top: (ghostY + r) * CELL + 1,
            width: CELL - 2, height: CELL - 2, border: `1px solid ${piece.color}`, opacity: 0.3, borderRadius: 1
          }} />
        ) : null))}
        {/* Active piece */}
        {piece.shape.map((row, r) => row.map((v, c) => v && piece.y + r >= 0 ? (
          <div key={`p${r}-${c}`} style={{
            position: 'absolute', left: (piece.x + c) * CELL + 1, top: (piece.y + r) * CELL + 1,
            width: CELL - 2, height: CELL - 2, background: piece.color,
            boxShadow: `0 0 4px ${piece.color}88`, borderRadius: 1
          }} />
        ) : null))}
        {dead && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
            <p className="text-sm glow mb-1">GAME OVER</p>
            <p className="text-xs text-muted-foreground mb-3">score: {score}</p>
            <button onClick={reset} className="text-xs border border-border px-3 py-1 hover:bg-secondary">$ restart</button>
          </div>
        )}
      </div>
    </div>
  );
}