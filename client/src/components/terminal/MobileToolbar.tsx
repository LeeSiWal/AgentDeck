import { agentDeckWS } from '../../lib/ws';

interface MobileToolbarProps {
  agentId: string;
}

const KEYS = [
  { label: 'Esc', data: '\x1b' },
  { label: 'Tab', data: '\t' },
  { label: '⇧Tab', data: '\x1b[Z', accent: true },
  { label: 'Ctrl+C', data: '\x03' },
  { label: 'Ctrl+D', data: '\x04' },
  { label: 'Ctrl+Z', data: '\x1a' },
  { label: 'Ctrl+L', data: '\x0c' },
  { label: '\u2191', data: '\x1b[A' },
  { label: '\u2193', data: '\x1b[B' },
  { label: '\u2190', data: '\x1b[D' },
  { label: '\u2192', data: '\x1b[C' },
];

export function MobileToolbar({ agentId }: MobileToolbarProps) {
  const send = (data: string) => {
    agentDeckWS.send('terminal:input', { agentId, data });
  };

  return (
    <div className="flex gap-2 px-3 py-2.5 overflow-x-auto scrollbar-hide safe-bottom bg-deck-surface border-t border-deck-border">
      {KEYS.map((key) => (
        <button
          key={key.label}
          onTouchStart={(e) => {
            e.preventDefault();
            send(key.data);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            send(key.data);
          }}
          className={`shrink-0 px-4 py-2.5 rounded-lg text-sm font-mono select-none touch-manipulation active:opacity-70 ${
            (key as any).accent ? 'bg-deck-accent/20 text-deck-accent' : 'bg-deck-bg text-deck-text'
          }`}
        >
          {key.label}
        </button>
      ))}
    </div>
  );
}
