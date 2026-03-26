import { useState, useRef } from 'react';
import { useAppStore } from '../../stores/appStore';
import { IconClose } from '../icons';

interface BrowserPanelProps {
  agentId: string;
  onClose: () => void;
}

export function BrowserPanel({ agentId, onClose }: BrowserPanelProps) {
  const meta = useAppStore((s) => s.agentMeta.get(agentId));
  const ports = meta?.listeningPorts || [];
  const defaultUrl = ports.length > 0 ? `http://localhost:${ports[0]}` : '';
  const [url, setUrl] = useState(defaultUrl);
  const [inputUrl, setInputUrl] = useState(defaultUrl);
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
        <button onClick={() => iframeRef.current?.contentWindow?.history.back()} className="p-1 rounded hover:bg-deck-border/50 text-deck-text-dim text-xs">◀</button>
        <button onClick={() => iframeRef.current?.contentWindow?.history.forward()} className="p-1 rounded hover:bg-deck-border/50 text-deck-text-dim text-xs">▶</button>
        <button onClick={() => { if (iframeRef.current) iframeRef.current.src = url; }} className="p-1 rounded hover:bg-deck-border/50 text-deck-text-dim text-xs">↻</button>

        <form onSubmit={(e) => { e.preventDefault(); navigateTo(inputUrl); }} className="flex-1 flex">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="http://localhost:3000"
            className="flex-1 bg-deck-bg border border-deck-border rounded px-2 py-0.5 text-xs outline-none text-deck-text"
          />
        </form>

        <button onClick={onClose} className="p-1 rounded hover:bg-deck-border/50">
          <IconClose size={12} />
        </button>
      </div>

      {ports.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 border-b border-deck-border/50 shrink-0">
          {ports.map((port) => (
            <button
              key={port}
              onClick={() => navigateTo(`http://localhost:${port}`)}
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                url.includes(`:${port}`) ? 'bg-deck-accent/20 text-deck-accent' : 'bg-deck-bg text-deck-text-dim hover:bg-deck-border/30'
              }`}
            >
              :{port}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1" style={{ minHeight: 0 }}>
        {url ? (
          <>
            {error ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-sm text-deck-text-dim mb-2">이 페이지는 iframe에서 열 수 없습니다.</p>
                <a href={url} target="_blank" rel="noopener" className="text-xs text-blue-400 underline">새 탭에서 열기</a>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                src={url}
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                onError={() => setError(true)}
              />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-deck-text-dim">
            {ports.length === 0 ? '감지된 포트 없음' : 'URL을 입력하세요'}
          </div>
        )}
      </div>
    </div>
  );
}
