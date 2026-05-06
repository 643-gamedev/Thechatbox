import React, { useState } from 'react';
import { Delete, Phone } from 'lucide-react';

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

export default function Dialpad({ onCall, loading }) {
  const [input, setInput] = useState('');

  const press = (k) => {
    if (input.length < 13) setInput(p => p + k);
  };

  const handleCall = () => {
    if (input.trim()) onCall(input.trim());
  };

  // Auto-format as user types: 010-XXX-XXXX
  const display = input.length <= 3
    ? input
    : input.length <= 6
    ? `${input.slice(0, 3)}-${input.slice(3)}`
    : `${input.slice(0, 3)}-${input.slice(3, 6)}-${input.slice(6, 10)}`;

  return (
    <div className="flex flex-col items-center gap-4 p-6 w-full max-w-xs mx-auto">
      {/* Display */}
      <div className="w-full text-center border-b border-border pb-3 min-h-[40px]">
        <span className="text-2xl tracking-[0.2em] glow font-bold">{display || <span className="text-muted-foreground text-base">enter number...</span>}</span>
      </div>

      {/* Keys */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {KEYS.flat().map(k => (
          <button
            key={k}
            onClick={() => press(k)}
            className="aspect-square rounded-full border border-border text-lg font-bold hover:bg-secondary transition-colors flex items-center justify-center"
            style={{ minHeight: '52px' }}
          >
            {k}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 w-full justify-center mt-2">
        <button
          onClick={handleCall}
          disabled={!input || loading}
          className="flex items-center justify-center gap-2 px-8 py-3 rounded-full font-bold text-sm disabled:opacity-40 transition-colors"
          style={{ background: '#39FF14', color: '#000' }}
        >
          <Phone className="w-4 h-4" />
          {loading ? 'calling...' : 'call'}
        </button>
        <button
          onClick={() => setInput(p => p.slice(0, -1))}
          className="p-3 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
        >
          <Delete className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}