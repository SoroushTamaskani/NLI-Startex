import { AlertTriangle, CheckCircle2, ExternalLink, Link2, Lock, Search, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import type { SharedLink, Source } from '../../types';

const INITIAL_VISIBLE = 5;

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === 'vertexaisearch.cloud.google.com') return '';
    const path = decodeURIComponent(u.pathname + u.search).replace(/\/$/, '');
    return path.length > 60 ? `${path.slice(0, 57)}…` : path;
  } catch {
    return '';
  }
}

function Favicon({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false);
  if (!domain || failed) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cream-100 text-ink-faint" aria-hidden>
        <Link2 size={14} />
      </span>
    );
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
      alt=""
      width={24}
      height={24}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-6 w-6 rounded-md bg-white"
    />
  );
}

export function SourceList({
  sources,
  messageId,
  highlighted,
  expanded,
  onExpand,
}: {
  sources: Source[];
  messageId: string;
  highlighted: number | null;
  expanded: boolean;
  onExpand: () => void;
}) {
  const visible = expanded ? sources : sources.slice(0, INITIAL_VISIBLE);
  return (
    <div>
      <ol className="space-y-2">
        {visible.map(source => {
          const path = pathOf(source.url);
          return (
            <li
              key={source.id}
              id={`src-${messageId}-${source.id}`}
              className={cn(
                'scroll-mt-24 rounded-2xl border-2 border-cream-200 bg-white p-3 transition-colors',
                highlighted === source.id && 'flash border-brand-200',
              )}
            >
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="group flex items-start gap-3 rounded-xl"
              >
                <span className="mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-kids-blue/25 px-1.5 text-xs font-bold text-ink">
                  {source.id}
                </span>
                <Favicon domain={source.domain} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-ink group-hover:underline">
                    <span className="truncate">{source.domain || source.title}</span>
                    <ExternalLink size={13} className="shrink-0 text-ink-faint" aria-hidden />
                  </span>
                  {source.title && source.title !== source.domain && (
                    <span className="block truncate text-xs text-ink-soft">{source.title}</span>
                  )}
                  {path && <span className="block truncate font-mono text-[11px] text-ink-faint">{path}</span>}
                  {source.origin === 'shared-link' && (
                    <span className="mt-1 inline-block rounded-full bg-kids-yellow/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
                      Link you shared
                    </span>
                  )}
                </span>
              </a>
              {source.supports.length > 0 && (
                <div className="mt-2 space-y-1 border-l-4 border-kids-blue/40 pl-3 ml-9">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Backs up</p>
                  {source.supports.map(text => (
                    <p key={text} className="text-xs leading-relaxed text-ink-soft">
                      “{text}”
                    </p>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {!expanded && sources.length > INITIAL_VISIBLE && (
        <button
          type="button"
          onClick={onExpand}
          className="mt-2 w-full rounded-2xl border-2 border-dashed border-cream-300 py-2 text-sm font-bold text-brand-700 hover:bg-cream-100"
        >
          Show all {sources.length} sources
        </button>
      )}
    </div>
  );
}

const LINK_STATUS: Record<SharedLink['status'], { text: string; icon: typeof CheckCircle2; className: string }> = {
  read: { text: 'Read', icon: CheckCircle2, className: 'text-verdict-true-ink' },
  failed: { text: "Couldn't open", icon: AlertTriangle, className: 'text-verdict-misleading-ink' },
  paywalled: { text: 'Behind a paywall', icon: Lock, className: 'text-verdict-misleading-ink' },
  unsafe: { text: 'Blocked as unsafe', icon: ShieldAlert, className: 'text-verdict-false-ink' },
  unknown: { text: 'Unknown', icon: AlertTriangle, className: 'text-ink-faint' },
};

export function SharedLinks({ links }: { links: SharedLink[] }) {
  return (
    <ul className="space-y-1.5">
      {links.map(link => {
        const status = LINK_STATUS[link.status];
        const Icon = status.icon;
        return (
          <li key={link.url} className="flex items-center gap-2 text-xs">
            <Icon size={14} className={cn('shrink-0', status.className)} aria-hidden />
            <span className={cn('shrink-0 font-bold', status.className)}>{status.text}:</span>
            <span className="truncate font-mono text-ink-soft">{link.url}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function SearchQueries({ queries }: { queries: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Search size={13} className="text-ink-faint" aria-hidden />
      <span className="text-xs font-semibold text-ink-faint">Searched for:</span>
      {queries.map(q => (
        <span key={q} className="rounded-full bg-cream-100 px-2.5 py-0.5 text-xs text-ink-soft">
          {q}
        </span>
      ))}
    </div>
  );
}

/**
 * Google requires grounded answers to show its search suggestions as provided.
 * The HTML comes from Google; a sandboxed frame keeps it isolated from the app.
 */
export function SearchSuggestions({ html }: { html: string }) {
  const doc = `<!doctype html><html><head><base target="_blank"><style>html,body{margin:0;background:transparent;overflow:hidden}</style></head><body>${html}</body></html>`;
  return (
    <iframe
      title="Google Search suggestions"
      srcDoc={doc}
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      className="h-[68px] w-full rounded-xl border-0"
    />
  );
}
