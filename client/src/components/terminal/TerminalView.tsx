import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { agentDeckWS } from '../../lib/ws';
import { useDevice } from '../../hooks/useDevice';

interface TerminalViewProps {
  agentId: string;
  fontSize?: number;
  rawMode?: boolean;
}

export function TerminalView({ agentId, fontSize, rawMode = false }: TerminalViewProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const dataDisposableRef = useRef<{ dispose: () => void } | null>(null);
  const { isMobile, isTablet } = useDevice();
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [hasOutput, setHasOutput] = useState(false);

  const statusRef = useRef(status);
  statusRef.current = status;
  const hasOutputRef = useRef(hasOutput);
  hasOutputRef.current = hasOutput;

  const resolvedFontSize = fontSize ?? (isMobile ? 12 : isTablet ? 13 : 14);

  useEffect(() => {
    const container = termRef.current;
    if (!container) return;

    let disposed = false;

    const terminal = new Terminal({
      fontSize: resolvedFontSize,
      fontFamily: "'JetBrains Mono', 'D2Coding', 'Noto Sans KR', monospace",
      theme: {
        background: '#0a0a0f',
        foreground: '#e2e8f0',
        cursor: '#6366f1',
        cursorAccent: '#0a0a0f',
        selectionBackground: '#6366f140',
        selectionForeground: '#ffffff',
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
      cursorBlink: false,
      scrollback: 3000,
      scrollSensitivity: 1.25,
      smoothScrollDuration: 90,
      allowTransparency: false,
      disableStdin: true,
      allowProposedApi: true,
      scrollOnUserInput: false,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());
    try {
      const unicodeAddon = new Unicode11Addon();
      terminal.loadAddon(unicodeAddon);
      terminal.unicode.activeVersion = '11';
    } catch {}

    terminal.open(container);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // --- safeFit: skip if same size, double-RAF, no refresh during scroll ---
    let lastW = 0;
    let lastH = 0;
    let fitRaf = 0;

    const safeFit = () => {
      if (disposed) return;
      if (!container.isConnected) return;

      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;

      cancelAnimationFrame(fitRaf);
      fitRaf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (disposed) return;
          try { fitAddon.fit(); } catch { return; }
          agentDeckWS.send('terminal:resize', {
            agentId,
            cols: terminal.cols,
            rows: terminal.rows,
          });
        });
      });
    };

    // --- Connection & Attach ---
    const doAttach = () => {
      agentDeckWS.send('terminal:attach', {
        agentId,
        cols: terminal.cols,
        rows: terminal.rows,
      });
    };

    if (agentDeckWS.connected) {
      doAttach();
      setStatus('connected');
    }

    const unsubConnect = agentDeckWS.on('open', () => {
      doAttach();
      setStatus('connected');
    });
    const unsubDisconnect = agentDeckWS.on('close', () => {
      setStatus('disconnected');
    });

    // --- Output ---
    const unsubOutput = agentDeckWS.on('terminal:output', (payload: any) => {
      if (payload.agentId === agentId) {
        terminal.write(payload.data);
        if (!hasOutputRef.current) setHasOutput(true);
        if (statusRef.current !== 'connected') setStatus('connected');
      }
    });

    // ========================================
    // Event sources that trigger safeFit()
    // ========================================

    // 1. ResizeObserver — container size changes
    const ro = new ResizeObserver(() => safeFit());
    ro.observe(container);

    // 2. pageshow — initial load + bfcache restore
    const onPageShow = () => { lastW = 0; lastH = 0; safeFit(); };
    window.addEventListener('pageshow', onPageShow);

    // 3. visualViewport.resize — debounced 100ms (keyboard animation fires many events)
    const vv = window.visualViewport;
    let vvTimer = 0;
    const onVVResize = () => {
      clearTimeout(vvTimer);
      vvTimer = window.setTimeout(() => { lastW = 0; lastH = 0; safeFit(); }, 100);
    };
    vv?.addEventListener('resize', onVVResize);

    // 4. Web fonts
    document.fonts?.ready?.then(() => { lastW = 0; lastH = 0; safeFit(); });

    // Initial fit
    safeFit();

    return () => {
      disposed = true;
      cancelAnimationFrame(fitRaf);
      clearTimeout(vvTimer);
      unsubOutput();
      unsubConnect();
      unsubDisconnect();
      agentDeckWS.send('terminal:detach', { agentId });
      ro.disconnect();
      window.removeEventListener('pageshow', onPageShow);
      vv?.removeEventListener('resize', onVVResize);
      dataDisposableRef.current?.dispose();
      dataDisposableRef.current = null;
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [agentId, resolvedFontSize]);

  // Toggle raw mode without recreating terminal
  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    dataDisposableRef.current?.dispose();
    dataDisposableRef.current = null;

    if (rawMode) {
      terminal.options.disableStdin = false;
      terminal.options.cursorBlink = true;
      dataDisposableRef.current = terminal.onData((data) => {
        agentDeckWS.send('terminal:input', { agentId, data });
      });
      terminal.focus();
    } else {
      terminal.options.disableStdin = true;
      terminal.options.cursorBlink = false;
    }
  }, [rawMode, agentId]);

  const handleClick = useCallback(() => {
    if (rawMode && terminalRef.current) {
      terminalRef.current.focus();
    }
  }, [rawMode]);

  return (
    <div className="relative w-full h-full terminal-shell">
      {status !== 'connected' && (
        <div className="absolute top-0 left-0 right-0 z-10 px-3 py-1.5 text-xs flex items-center gap-2"
             style={{
               background: status === 'disconnected' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
               color: status === 'disconnected' ? '#ef4444' : '#f59e0b',
             }}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${status !== 'disconnected' ? 'animate-pulse' : ''}`}
                style={{ background: status === 'disconnected' ? '#ef4444' : '#f59e0b' }} />
          {status === 'disconnected' ? 'Disconnected — reconnecting...' : 'Connecting...'}
        </div>
      )}

      {status === 'connected' && !hasOutput && (
        <div className="absolute top-0 left-0 right-0 z-10 px-3 py-1.5 text-xs flex items-center gap-2"
             style={{ background: 'rgba(34,197,94,0.08)', color: '#64748b' }}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#22c55e' }} />
          Connected — waiting for output...
        </div>
      )}

      <div
        ref={termRef}
        onClick={handleClick}
        className="w-full h-full cursor-text"
      />
    </div>
  );
}
