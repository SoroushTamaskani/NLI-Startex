import { AlertTriangle, GraduationCap, Menu, Plus, ShieldCheck, WifiOff, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { HealthState, Toast } from '../hooks/useMisc';
import { cn } from '../lib/utils';

export function Header({ onMenu, onNew, onAcademy, showNew }: { onMenu: () => void; onNew: () => void; onAcademy: () => void; showNew: boolean }) {
  return (
    <header className="flex items-center justify-between gap-3 border-b-4 border-cream-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <button type="button" onClick={onMenu} className="rounded-2xl p-2 text-brand-700 hover:bg-cream-100 lg:hidden" aria-label="Open menu">
          <Menu size={26} />
        </button>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-kids-blue text-white shadow-bubble" aria-hidden>
          <ShieldCheck size={26} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold leading-none tracking-tight text-ink">NLI</h1>
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-700">No Lie AI</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showNew && (
          <button
            type="button"
            onClick={onNew}
            className="flex items-center gap-1.5 rounded-2xl border-2 border-cream-200 px-3 py-2 text-sm font-bold text-brand-700 hover:bg-cream-100"
          >
            <Plus size={18} aria-hidden /> <span className="hidden sm:inline">New check</span>
            <span className="sr-only sm:hidden">New check</span>
          </button>
        )}
        <button
          type="button"
          onClick={onAcademy}
          className="flex items-center gap-2 rounded-2xl bg-kids-yellow px-3 py-2 font-display text-sm font-semibold text-ink shadow-bubble hover:brightness-95 sm:px-4"
        >
          <GraduationCap size={20} aria-hidden />
          <span className="hidden sm:inline">Truth Academy</span>
          <span className="sr-only sm:hidden">Truth Academy</span>
        </button>
      </div>
    </header>
  );
}

export function HealthBanner({ health }: { health: HealthState }) {
  if (health.status === 'loading' || health.status === 'ready') return null;
  const offline = health.status === 'offline';
  return (
    <div className="flex items-start gap-3 border-b-2 border-verdict-false/20 bg-verdict-false-soft px-4 py-3 text-sm text-verdict-false-ink sm:px-6" role="alert">
      {offline ? <WifiOff size={18} className="mt-0.5 shrink-0" aria-hidden /> : <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />}
      <p>
        {offline ? (
          <>
            <strong>Can't reach the NLI server.</strong> Check your connection, or start it with <code className="font-mono">npm run dev</code>.
          </>
        ) : (
          <>
            <strong>NLI isn't connected to Gemini yet.</strong> Add <code className="font-mono">GEMINI_API_KEY</code> to{' '}
            <code className="font-mono">.env.local</code> on the server and restart it.
          </>
        )}
      </p>
    </div>
  );
}

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-32 z-[120] flex flex-col items-center gap-2 px-4" aria-live="assertive">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className={cn(
              'pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-semibold shadow-lift',
              toast.tone === 'error' ? 'border-verdict-false/30 bg-white text-verdict-false-ink' : 'border-cream-200 bg-white text-ink',
            )}
          >
            <span className="flex-1">{toast.message}</span>
            <button type="button" onClick={() => onDismiss(toast.id)} className="rounded-lg p-0.5 hover:bg-cream-100" aria-label="Dismiss">
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
