import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { IconClose } from '../icons';

interface BrowserPanelProps {
  agentId: string;
  onClose: () => void;
}

function getIframeSrc(inputUrl: string): string {
  if (!inputUrl) return '';
  const normalized = inputUrl.startsWith('http') ? inputUrl : `http://${inputUrl}`;
  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    // localhost/127.0.0.1 → direct connection (no proxy needed)
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return normalized;
    }
    // External URL → route through server proxy to bypass X-Frame-Options
    return `/api/proxy?url=${encodeURIComponent(normalized)}`;
  } catch {
    return normalized;
  }
}

function isLocalUrl(inputUrl: string): boolean {
  try {
    const parsed = new URL(inputUrl.startsWith('http') ? inputUrl : `http://${inputUrl}`);
    const host = parsed.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

export function BrowserPanel({ agentId, onClose }: BrowserPanelProps) {
  const meta = useAppStore((s) => s.agentMeta.get(agentId));
  const ports = meta?.listeningPorts || [];
  const [displayUrl, setDisplayUrl] = useState('');  // What user sees in URL bar
  const [iframeSrc, setIframeSrc] = useState('');     // Actual iframe src (may be proxy)
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-navigate to first detected port
  useEffect(() => {
    if (!displayUrl && ports.length > 0) {
      const autoUrl = `http://localhost:${ports[0]}`;
      setDisplayUrl(autoUrl);
      setIframeSrc(autoUrl);
    }
  }, [ports, displayUrl]);

  const navigateTo = (newUrl: string) => {
    let normalized = newUrl.trim();
    if (normalized && !normalized.startsWith('http')) {
      normalized = `http://${normalized}`;
    }
    setDisplayUrl(normalized);
    setIframeSrc(getIframeSrc(normalized));
    setError(false);
  };

  const isLocal = isLocalUrl(displayUrl);

  return (
    <div className="flex flex-col h-full bg-deck-surface overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-deck-border shrink-0">
        <button onClick={() => iframeRef.current?.contentWindow?.history.back()} className="p-1.5 rounded hover:bg-deck-border/50 active:bg-deck-border/50 text-deck-text-dim text-xs">◀</button>
        <button onClick={() => iframeRef.current?.contentWindow?.history.forward()} className="p-1.5 rounded hover:bg-deck-border/50 active:bg-deck-border/50 text-deck-text-dim text-xs">▶</button>
        <button onClick={() => { if (iframeRef.current) iframeRef.current.src = iframeSrc; }} className="p-1.5 rounded hover:bg-deck-border/50 active:bg-deck-border/50 text-deck-text-dim text-xs">↻</button>

        <form onSubmit={(e) => { e.preventDefault(); navigateTo(displayUrl); }} className="flex-1 flex">
          <input
            type="text"
            value={displayUrl}
            onChange={(e) => setDisplayUrl(e.target.value)}
            placeholder="URL (localhost or external)"
            className="flex-1 bg-deck-bg border border-deck-border rounded px-2 py-1 text-xs outline-none text-deck-text"
          />
        </form>

        {/* Open in new tab */}
        {displayUrl && (
          <a href={displayUrl} target="_blank" rel="noopener" className="p-1.5 rounded hover:bg-deck-border/50 active:bg-deck-border/50 text-deck-text-dim text-xs" title="새 탭에서 열기">
            ↗
          </a>
        )}

        <button onClick={onClose} className="p-1.5 rounded hover:bg-deck-border/50 active:bg-deck-border/50">
          <IconClose size={12} />
        </button>
      </div>

      {/* Port shortcuts + proxy indicator */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-deck-border/50 shrink-0 overflow-x-auto">
        {ports.map((port) => (
          <button
            key={port}
            onClick={() => navigateTo(`http://localhost:${port}`)}
            className={`text-[11px] px-2 py-1 rounded font-mono shrink-0 active:opacity-70 ${
              displayUrl.includes(`:${port}`) ? 'bg-deck-accent/20 text-deck-accent' : 'bg-deck-bg text-deck-text-dim hover:bg-deck-border/30'
            }`}
          >
            :{port}
          </button>
        ))}
        {displayUrl && !isLocal && (
          <span className="text-[10px] text-amber-400 ml-auto shrink-0">proxy</span>
        )}
      </div>

      {/* iframe wrapper with iOS Safari scroll fix */}
      <div
        className="flex-1 min-h-0"
        style={{
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        {iframeSrc ? (
          <>
            {error ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-sm text-deck-text-dim mb-3">이 페이지를 로드할 수 없습니다.</p>
                <a
                  href={displayUrl}
                  target="_blank"
                  rel="noopener"
                  className="text-sm px-4 py-2 rounded-lg bg-deck-accent text-white active:opacity-80"
                >
                  새 탭에서 열기
                </a>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                src={iframeSrc}
                style={{ width: '100%', height: '100%', border: 'none' }}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                onError={() => setError(true)}
                onLoad={() => {
                  try {
                    const doc = iframeRef.current?.contentDocument;
                    if (doc && doc.body && doc.body.innerHTML === '') {
                      setError(true);
                    }
                  } catch {
                    // Cross-origin through proxy — normal
                  }
                }}
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <p className="text-sm text-deck-text-dim mb-1">
              {ports.length === 0 ? '감지된 포트 없음' : 'URL을 입력하세요'}
            </p>
            <p className="text-[11px] text-deck-text-dim">
              {ports.length === 0
                ? '에이전트가 서버를 시작하면 자동으로 감지됩니다'
                : 'localhost 또는 외부 URL 모두 지원'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
