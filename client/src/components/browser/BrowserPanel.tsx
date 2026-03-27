import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { IconClose } from '../icons';

interface BrowserPanelProps {
  agentId: string;
  onClose: () => void;
}

export function BrowserPanel({ agentId, onClose }: BrowserPanelProps) {
  const meta = useAppStore((s) => s.agentMeta.get(agentId));
  const ports = meta?.listeningPorts || [];
  const [url, setUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-navigate to first detected port
  useEffect(() => {
    if (!url && ports.length > 0) {
      const autoUrl = `http://localhost:${ports[0]}`;
      setUrl(autoUrl);
      setInputUrl(autoUrl);
    }
  }, [ports, url]);

  const navigateTo = (newUrl: string) => {
    let normalized = newUrl.trim();
    if (normalized && !normalized.startsWith('http')) {
      normalized = `http://${normalized}`;
    }
    setUrl(normalized);
    setInputUrl(normalized);
    setError(false);
  };

  return (
    <div className="flex flex-col h-full bg-deck-surface overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-deck-border shrink-0">
        <button onClick={() => iframeRef.current?.contentWindow?.history.back()} className="p-1.5 rounded hover:bg-deck-border/50 active:bg-deck-border/50 text-deck-text-dim text-xs">◀</button>
        <button onClick={() => iframeRef.current?.contentWindow?.history.forward()} className="p-1.5 rounded hover:bg-deck-border/50 active:bg-deck-border/50 text-deck-text-dim text-xs">▶</button>
        <button onClick={() => { if (iframeRef.current) iframeRef.current.src = url; }} className="p-1.5 rounded hover:bg-deck-border/50 active:bg-deck-border/50 text-deck-text-dim text-xs">↻</button>

        <form onSubmit={(e) => { e.preventDefault(); navigateTo(inputUrl); }} className="flex-1 flex">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="http://localhost:3000"
            className="flex-1 bg-deck-bg border border-deck-border rounded px-2 py-1 text-xs outline-none text-deck-text"
          />
        </form>

        <button onClick={onClose} className="p-1.5 rounded hover:bg-deck-border/50 active:bg-deck-border/50">
          <IconClose size={12} />
        </button>
      </div>

      {ports.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 border-b border-deck-border/50 shrink-0 overflow-x-auto">
          {ports.map((port) => (
            <button
              key={port}
              onClick={() => navigateTo(`http://localhost:${port}`)}
              className={`text-[11px] px-2 py-1 rounded font-mono shrink-0 active:opacity-70 ${
                url.includes(`:${port}`) ? 'bg-deck-accent/20 text-deck-accent' : 'bg-deck-bg text-deck-text-dim hover:bg-deck-border/30'
              }`}
            >
              :{port}
            </button>
          ))}
        </div>
      )}

      {/* iframe wrapper: iOS Safari needs -webkit-overflow-scrolling:touch on parent
           to allow iframe scrolling. Without it, iframe expands to full content height
           and ignores the container dimensions. */}
      <div
        className="flex-1 min-h-0"
        style={{
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        {url ? (
          <>
            {error ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-sm text-deck-text-dim mb-3">이 페이지는 iframe에서 열 수 없습니다.</p>
                <a
                  href={url}
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
                src={url}
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
                    // Cross-origin — normal
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
            {ports.length === 0 && (
              <p className="text-[11px] text-deck-text-dim">
                에이전트가 서버를 시작하면 자동으로 감지됩니다
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
