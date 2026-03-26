import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  return (
    <div className={`markdown-preview p-4 text-sm leading-relaxed text-deck-text ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className: codeClass, children, ...props }) {
            return (
              <code className={`${codeClass || ''} bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono`} {...props}>
                {children}
              </code>
            );
          },
          pre({ children }) {
            return <pre className="bg-black/30 p-3 rounded-lg overflow-x-auto text-[13px] my-2">{children}</pre>;
          },
          a({ href, children }) {
            return <a href={href} target="_blank" rel="noopener" className="text-blue-400 underline">{children}</a>;
          },
          h1({ children }) { return <h1 className="text-xl font-semibold mt-5 mb-2">{children}</h1>; },
          h2({ children }) { return <h2 className="text-lg font-semibold mt-4 mb-2">{children}</h2>; },
          h3({ children }) { return <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>; },
          p({ children }) { return <p className="my-2">{children}</p>; },
          ul({ children }) { return <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>; },
          ol({ children }) { return <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>; },
          blockquote({ children }) {
            return <blockquote className="border-l-3 border-slate-600 pl-3 text-deck-text-dim my-2">{children}</blockquote>;
          },
          table({ children }) { return <table className="border-collapse w-full my-2 text-[13px]">{children}</table>; },
          th({ children }) { return <th className="border border-slate-700 px-2 py-1 text-left bg-slate-800/50">{children}</th>; },
          td({ children }) { return <td className="border border-slate-700 px-2 py-1">{children}</td>; },
        }}
      />
    </div>
  );
}
