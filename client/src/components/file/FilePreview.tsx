interface FilePreviewProps {
  path: string;
  content: string;
  onEdit?: () => void;
}

export function FilePreview({ path, content, onEdit }: FilePreviewProps) {
  const fileName = path.split('/').pop() || path;

  return (
    <div className="flex flex-col h-full bg-deck-bg">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-deck-border">
        <span className="text-xs font-mono text-deck-text-dim truncate">{fileName}</span>
        {onEdit && (
          <button onClick={onEdit} className="text-xs px-2 py-0.5 rounded bg-deck-surface text-deck-text hover:bg-deck-border">
            Edit
          </button>
        )}
      </div>
      <pre className="flex-1 overflow-auto p-3 text-xs font-mono text-deck-text leading-relaxed whitespace-pre-wrap break-words">
        {content}
      </pre>
    </div>
  );
}
