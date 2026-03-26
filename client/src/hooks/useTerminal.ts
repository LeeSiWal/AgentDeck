import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { agentDeckWS } from '../lib/ws';
import '@xterm/xterm/css/xterm.css';

interface UseTerminalOptions {
  agentId: string;
  containerRef: React.RefObject<HTMLDivElement>;
  onData?: (data: string) => void;
}

export function useTerminal({ agentId, containerRef, onData }: UseTerminalOptions) {
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current || !agentId) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace",
      theme: {
        background: '#0a0a0f',
        foreground: '#e2e8f0',
        cursor: '#6366f1',
        selectionBackground: 'rgba(99, 102, 241, 0.3)',
        black: '#1e1e2e',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#f59e0b',
        blue: '#6366f1',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e2e8f0',
        brightBlack: '#64748b',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#fbbf24',
        brightBlue: '#818cf8',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#f8fafc',
      },
      allowTransparency: true,
      scrollback: 5000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const unicodeAddon = new Unicode11Addon();

    term.loadAddon(fitAddon);
    term.loadAddon(unicodeAddon);
    term.unicode.activeVersion = '11';

    term.open(containerRef.current);

    // Fit after a brief delay for layout
    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Send input to server
    term.onData((data) => {
      agentDeckWS.send('terminal:input', { agentId, data });
      onData?.(data);
    });

    // Receive output from server
    const unsubOutput = agentDeckWS.on('terminal:output', (payload) => {
      if (payload.agentId === agentId) {
        term.write(payload.data);
      }
    });

    // Attach terminal
    const cols = term.cols;
    const rows = term.rows;
    agentDeckWS.send('terminal:attach', { agentId, cols, rows });

    // Resize handling
    const handleResize = () => {
      fitAddon.fit();
      agentDeckWS.send('terminal:resize', {
        agentId,
        cols: term.cols,
        rows: term.rows,
      });
    };

    // Handle visualViewport for mobile keyboard
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', handleResize);
    }
    window.addEventListener('resize', handleResize);

    // ResizeObserver for container changes
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        fitAddon.fit();
        agentDeckWS.send('terminal:resize', {
          agentId,
          cols: term.cols,
          rows: term.rows,
        });
      });
    });
    ro.observe(containerRef.current);

    return () => {
      unsubOutput();
      agentDeckWS.send('terminal:detach', { agentId });
      window.removeEventListener('resize', handleResize);
      if (vv) vv.removeEventListener('resize', handleResize);
      ro.disconnect();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [agentId]);

  const write = useCallback((data: string) => {
    termRef.current?.write(data);
  }, []);

  const focus = useCallback(() => {
    termRef.current?.focus();
  }, []);

  const fit = useCallback(() => {
    fitAddonRef.current?.fit();
  }, []);

  return { terminal: termRef, write, focus, fit };
}
