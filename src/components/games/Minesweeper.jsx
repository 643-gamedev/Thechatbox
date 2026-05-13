import React, { useState } from 'react';

const ROWS = 9, COLS = 9, MINES = 10;

function createBoard() {
  const board = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => ({ r, c, mine: false, revealed: false, flagged: false, adj: 0 }))
  );
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (!board[r][c].mine) { board[r][c].mine = true; placed++; }
  }
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (board[r][c].mine) continue;
      let adj = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          if (board[r + dr]?.[c + dc]?.mine) adj++;
      board[r][c].adj = adj;
    }
  return board;
}

function reveal(board, r, c) {
  if (!board[r]?.[c] || board[r][c].revealed || board[r][c].flagged) return;
  board[r][c].revealed = true;
  if (board[r][c].adj === 0 && !board[r][c].mine)
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++)
        reveal(board, r + dr, c + dc);
}

const adjColors = ['', '#39FF14', '#00bfff', '#ff4444', '#ff8800', '#ff0080', '#00ffff', '#ffffff', '#888888'];

export default function Minesweeper() {
  const [board, setBoard] = useState(() => createBoard());
  const [status, setStatus] = useState('playing'); // playing | won | lost
  const [flags, setFlags] = useState(MINES);

  const reset = () => { setBoard(createBoard()); setStatus('playing'); setFlags(MINES); };

  const click = (r, c) => {
    if (status !== 'playing') return;
    const nb = board.map(row => row.map(cell => ({ ...cell })));
    if (nb[r][c].mine) {
      nb.forEach(row => row.forEach(cell => { if (cell.mine) cell.revealed = true; }));
      setBoard(nb); setStatus('lost'); return;
    }
    reveal(nb, r, c);
    const won = nb.every(row => row.every(cell => cell.mine || cell.revealed));
    setBoard(nb);
    if (won) setStatus('won');
  };

  const rightClick = (e, r, c) => {
    e.preventDefault();
    if (status !== 'playing' || board[r][c].revealed) return;
    const nb = board.map(row => row.map(cell => ({ ...cell })));
    nb[r][c].flagged = !nb[r][c].flagged;
    setFlags(f => nb[r][c].flagged ? f - 1 : f + 1);
    setBoard(nb);
  };

  const CELL = 30;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span>💣 <span className="text-foreground">{flags}</span></span>
        <span className="text-[10px]">Right-click to flag</span>
        <button onClick={reset} className="border border-border px-2 py-0.5 text-[10px] hover:bg-secondary">$ reset</button>
      </div>
      {(status === 'won' || status === 'lost') && (
        <div className={`text-sm font-bold ${status === 'won' ? 'glow' : 'text-red-400'}`}>
          {status === 'won' ? '✓ YOU WIN!' : '✗ BOOM!'}
        </div>
      )}
      <div className="border border-border" style={{ background: '#050a05' }}>
        {board.map((row, r) => (
          <div key={r} className="flex">
            {row.map((cell, c) => (
              <div
                key={c}
                onClick={() => click(r, c)}
                onContextMenu={(e) => rightClick(e, r, c)}
                className="select-none cursor-pointer flex items-center justify-center border border-border/30 text-xs font-bold transition-colors"
                style={{
                  width: CELL, height: CELL,
                  background: cell.revealed ? (cell.mine ? '#3a0a0a' : '#0a1a0a') : '#050a05',
                  color: cell.mine && cell.revealed ? '#ff4444' : adjColors[cell.adj] || '#39FF14',
                  fontSize: 12,
                }}
              >
                {cell.revealed
                  ? (cell.mine ? '💣' : cell.adj > 0 ? cell.adj : '')
                  : cell.flagged ? '🚩' : ''}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
