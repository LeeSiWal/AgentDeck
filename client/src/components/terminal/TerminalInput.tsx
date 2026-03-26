import { useState, useRef, useCallback, useEffect } from 'react';
import { agentDeckWS } from '../../lib/ws';
import { api } from '../../lib/api';

interface SlashCommand {
  name: string;
  type: string;
  description?: string;
}

interface TerminalInputProps {
  agentId: string;
}

const LINE_COLLAPSE_THRESHOLD = 3;

const TOOLBAR_KEYS = [
  { label: 'ESC', data: '\x1b', danger: true },
  { label: '\u2191', data: '\x1b[A' },
  { label: '\u2193', data: '\x1b[B' },
  { label: 'Tab', data: '\t' },
  { label: '⇧Tab', data: '\x1b[Z', accent: true },
  { label: 'C-c', data: '\x03' },
];

const TYPE_LABELS: Record<string, string> = {
  command: 'cmd',
  agent: 'agent',
  skill: 'skill',
};

export function TerminalInput({ agentId }: TerminalInputProps) {
  const [value, setValue] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [commands, setCommands] = useState<SlashCommand[]>([]);
  const [suggestions, setSuggestions] = useState<SlashCommand[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lines = value.split('\n');
  const lineCount = lines.length;
  const isLong = lineCount > LINE_COLLAPSE_THRESHOLD;

  // Fetch slash commands on mount
  useEffect(() => {
    api.slashCommands()
      .then((data) => { if (Array.isArray(data)) setCommands(data); })
      .catch(() => {});
  }, []);

  // Update suggestions as user types
  useEffect(() => {
    if (value.startsWith('/') || value.startsWith('@')) {
      const q = value.toLowerCase();
      const matched = commands.filter((c) => c.name.toLowerCase().startsWith(q));
      setSuggestions(matched.slice(0, 8));
      setSelectedIdx(0);
    } else {
      setSuggestions([]);
    }
  }, [value, commands]);

  const sendData = useCallback((data: string) => {
    // Send in chunks to avoid WebSocket/PTY buffer issues
    const CHUNK_SIZE = 4096;
    if (data.length <= CHUNK_SIZE) {
      agentDeckWS.send('terminal:input', { agentId, data });
    } else {
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        setTimeout(() => {
          agentDeckWS.send('terminal:input', { agentId, data: chunk });
        }, Math.floor(i / CHUNK_SIZE) * 10); // 10ms delay between chunks
      }
    }
  }, [agentId]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      sendData('\r');
      return;
    }
    sendData(trimmed + '\r');
    setValue('');
    setExpanded(false);
    setSuggestions([]);
  }, [value, sendData]);

  const applySuggestion = useCallback((cmd: string) => {
    setValue(cmd + ' ');
    setSuggestions([]);
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Autocomplete navigation
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && value.length < (suggestions[selectedIdx]?.name.length ?? 0))) {
        e.preventDefault();
        applySuggestion(suggestions[selectedIdx].name);
        return;
      }
      if (e.key === 'Escape') {
        setSuggestions([]);
        return;
      }
    }

    // Empty input: forward arrow keys to terminal
    if (!value && suggestions.length === 0) {
      if (e.key === 'ArrowUp') { e.preventDefault(); sendData('\x1b[A'); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); sendData('\x1b[B'); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); sendData('\x1b[D'); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); sendData('\x1b[C'); return; }
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      sendData('\x1b');
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [value, suggestions, selectedIdx, applySuggestion, sendData, handleSubmit]);

  return (
    <div className="relative">
      {/* Autocomplete dropdown */}
      {suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 max-h-48 overflow-y-auto shadow-xl z-20 bg-deck-surface border border-deck-border">
          {suggestions.map((cmd, i) => (
            <button
              key={cmd.name}
              onClick={() => applySuggestion(cmd.name)}
              className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-sm transition-colors ${
                i === selectedIdx ? 'bg-deck-accent/20 text-deck-text' : 'text-deck-text-dim hover:bg-deck-border/30'
              }`}
            >
              <span className="font-mono">{cmd.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-deck-bg text-deck-text-dim">
                {TYPE_LABELS[cmd.type] || cmd.type}
              </span>
              {cmd.description && (
                <span className="text-xs truncate ml-auto text-deck-text-dim">{cmd.description}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 md:gap-1 md:px-2 md:py-1 bg-deck-surface border-t border-deck-border">
        {TOOLBAR_KEYS.map((btn) => (
          <button
            key={btn.label}
            onClick={(e) => { e.preventDefault(); sendData(btn.data); textareaRef.current?.focus(); }}
            className={`px-3 py-2 rounded text-sm font-mono shrink-0 touch-manipulation select-none active:opacity-70
                       md:px-2 md:py-0.5 md:text-[11px] ${
                         btn.danger
                           ? 'bg-red-500/10 text-red-400'
                           : (btn as any).accent
                             ? 'bg-deck-accent/20 text-deck-accent'
                             : 'bg-deck-bg text-deck-text-dim'
                       }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="flex items-start gap-2 px-3 py-2.5 md:gap-1.5 md:px-2 md:py-1.5 safe-bottom bg-deck-bg border-t border-deck-border/50">
        <span className="text-sm shrink-0 font-mono mt-0.5 md:text-xs text-deck-accent">&gt;</span>

        <div className="flex-1 min-w-0">
          {isLong && !expanded ? (
            <button
              onClick={() => { setExpanded(true); setTimeout(() => textareaRef.current?.focus(), 0); }}
              className="flex items-center gap-2 w-full text-left"
            >
              <span className="font-mono text-base truncate md:text-sm text-deck-text">
                {lines[0]}
              </span>
              <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium bg-deck-accent text-white">
                {lineCount} lines
              </span>
            </button>
          ) : (
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => { if (isLong) setExpanded(false); }}
              placeholder="Type a command... ( / for slash commands)"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              rows={expanded ? Math.min(lineCount, 10) : 1}
              className="flex-1 w-full bg-transparent text-base outline-none font-mono min-w-0 md:text-sm resize-none text-deck-text"
              style={{ caretColor: 'var(--deck-accent, #6366f1)' }}
            />
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {isLong && expanded && (
            <button
              onClick={() => setExpanded(false)}
              className="px-2 py-1 rounded text-xs touch-manipulation active:opacity-70 bg-deck-surface text-deck-text-dim"
            >
              Collapse
            </button>
          )}
          <button
            onClick={handleSubmit}
            className="btn-primary px-4 py-2 rounded text-sm font-medium shrink-0 touch-manipulation active:opacity-70
                       md:px-2.5 md:py-1 md:text-xs"
          >
            &crarr;
          </button>
        </div>
      </div>
    </div>
  );
}
