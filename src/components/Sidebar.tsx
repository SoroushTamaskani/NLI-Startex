import { GraduationCap, History, Plus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useEscape } from '../hooks/useMisc';
import { dateGroup, lastVerdictEmoji } from '../lib/format';
import { cn } from '../lib/utils';
import type { Session } from '../types';

export function Sidebar({
  sessions,
  activeId,
  open,
  persistent,
  onClose,
  onSelect,
  onNew,
  onDelete,
  onClearAll,
  onOpenAcademy,
}: {
  sessions: Session[];
  activeId: string | null;
  open: boolean;
  persistent: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onOpenAcademy: () => void;
}) {
  const [query, setQuery] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  useEscape(open, onClose);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? sessions.filter(
          s =>
            s.title.toLowerCase().includes(q) ||
            s.messages.some(m => (m.role === 'user' ? m.text : m.result?.headline ?? '').toLowerCase().includes(q)),
        )
      : sessions;
    const map = new Map<string, Session[]>();
    for (const s of filtered) {
      const key = dateGroup(s.updatedAt);
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()];
  }, [sessions, query]);

  return (
    <>
      <div
        className={cn('fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] transition-opacity lg:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[19rem] max-w-[85vw] flex-col border-r-4 border-cream-200 bg-white transition-transform duration-300 lg:static lg:z-auto lg:max-w-none lg:translate-x-0',
          open ? 'translate-x-0 shadow-2xl lg:shadow-none' : '-translate-x-full',
        )}
        aria-label="Your checks"
      >
        <div className="flex items-center justify-between border-b-4 border-cream-200 bg-cream-100 px-4 py-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <History size={20} className="text-brand-600" aria-hidden /> My checks
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-brand-700 hover:bg-white lg:hidden" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <button
            type="button"
            onClick={onNew}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 font-display text-base font-semibold text-white shadow-bubble transition-colors hover:bg-brand-600"
          >
            <Plus size={20} aria-hidden /> New check
          </button>
          {sessions.length > 3 && (
            <label className="flex items-center gap-2 rounded-2xl border-2 border-cream-200 px-3 py-2 focus-within:border-brand-500">
              <Search size={16} className="text-ink-faint" aria-hidden />
              <span className="sr-only">Search your checks</span>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search my checks"
                className="w-full bg-transparent text-sm font-semibold text-ink placeholder:text-ink-faint focus:outline-none"
              />
            </label>
          )}
        </div>

        <nav className="custom-scrollbar flex-1 overflow-y-auto px-2 pb-4">
          {sessions.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-ink-faint">Your checks will appear here. 🔍</p>
          )}
          {sessions.length > 0 && groups.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-faint">No checks match “{query}”.</p>}
          {groups.map(([label, items]) => (
            <div key={label} className="mb-3">
              <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-faint">{label}</p>
              <ul className="space-y-0.5">
                {items.map(session => {
                  const emoji = lastVerdictEmoji(session);
                  const active = session.id === activeId;
                  return (
                    <li key={session.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => onSelect(session.id)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-xl py-2.5 pl-3 pr-10 text-left text-sm transition-colors',
                          active ? 'bg-kids-blue/25 font-bold text-ink' : 'font-semibold text-ink-soft hover:bg-cream-100',
                        )}
                      >
                        <span className="w-5 shrink-0 text-center" aria-hidden>
                          {emoji ?? '💬'}
                        </span>
                        <span className="truncate">{session.title}</span>
                      </button>
                      {confirmId === session.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(session.id);
                            setConfirmId(null);
                          }}
                          onBlur={() => setConfirmId(null)}
                          autoFocus
                          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg bg-verdict-false px-2 py-1 text-[11px] font-bold text-white"
                        >
                          Delete?
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmId(session.id)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-faint transition-opacity hover:bg-verdict-false-soft hover:text-verdict-false-ink focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label={`Delete “${session.title}”`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t-4 border-cream-200 p-4">
          <button
            type="button"
            onClick={onOpenAcademy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-kids-yellow px-4 py-2.5 font-display font-semibold text-ink shadow-bubble hover:brightness-95"
          >
            <GraduationCap size={20} aria-hidden /> Truth Academy 🎓
          </button>
          {!persistent && (
            <p className="text-center text-[11px] text-verdict-misleading-ink">This browser can't save history, so checks disappear when you close the page.</p>
          )}
          {sessions.length > 0 && (
            <button
              type="button"
              onClick={() => {
                // Two-step confirmation in the page: browser confirm() dialogs are blocked in some embeds.
                if (confirmClear) {
                  setConfirmClear(false);
                  onClearAll();
                } else {
                  setConfirmClear(true);
                }
              }}
              onBlur={() => setConfirmClear(false)}
              className={cn(
                'w-full rounded-xl py-1.5 text-xs font-bold',
                confirmClear ? 'bg-verdict-false text-white' : 'text-ink-faint hover:bg-verdict-false-soft hover:text-verdict-false-ink',
              )}
            >
              {confirmClear ? 'Tap again to delete every check and file' : 'Clear all history'}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
