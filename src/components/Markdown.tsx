import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';

/**
 * Renders model-written markdown safely: raw HTML is never rendered, and
 * citation links like `[2](#cite-2)` become buttons that jump to the source.
 */
export function Markdown({ text, onCite, className }: { text: string; onCite?: (id: number) => void; className?: string }) {
  const components: Components = {
    a({ href, children }) {
      const cite = href?.match(/^#cite-(\d+)$/);
      if (cite) {
        const id = Number(cite[1]);
        return (
          <button
            type="button"
            onClick={() => onCite?.(id)}
            className="cite mx-px inline-flex h-[1.15rem] min-w-[1.15rem] -translate-y-px items-center justify-center rounded-md bg-kids-blue/25 px-1 align-middle text-[10px] font-bold text-ink hover:bg-kids-blue/50"
            aria-label={`Source ${id}`}
          >
            {children}
          </button>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer nofollow">
          {children}
        </a>
      );
    },
    img() {
      // Images in model output could load from anywhere; don't render them.
      return null;
    },
  };

  return (
    <div className={cn('report text-sm', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
