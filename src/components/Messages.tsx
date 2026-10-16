import { Bot, Clock3, RefreshCw, Square } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useElapsed } from '../hooks/useMisc';
import { formatTime } from '../lib/format';
import { cn } from '../lib/utils';
import type { AssistantMessage, ErrorCode, PendingCheck, UserMessage } from '../types';
import { AttachmentView, type PreviewItem } from './AttachmentView';
import { LazyMarkdown as Markdown } from './LazyMarkdown';
import { ResultCard } from './result/ResultCard';

export function UserBubble({ message, onPreview }: { message: UserMessage; onPreview: (item: PreviewItem) => void }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%] space-y-1 sm:max-w-[75%]">
        <div className="rounded-[28px] rounded-tr-md bg-kids-blue/60 px-5 py-3.5 text-ink shadow-bubble">
          {message.attachments.length > 0 && (
            <div className={cn('flex flex-wrap gap-2', message.text && 'mb-3')}>
              {message.attachments.map(a => (
                <AttachmentView key={a.id} attachment={a} onPreview={onPreview} />
              ))}
            </div>
          )}
          {message.text && <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>}
        </div>
        <p className="px-2 text-right text-[11px] text-ink-faint">
          {message.mode === 'quick' ? '⚡ Fast check' : '🔬 Careful check'} · {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

const ERROR_TITLES: Partial<Record<ErrorCode, string>> = {
  CANCELLED: 'Check stopped ✋',
  QUOTA: 'NLI needs a little break 😮‍💨',
  RATE_LIMITED: 'Slow down, detective! 🐢',
  NETWORK: "Can't reach NLI 📡",
  FILE_EXPIRED: 'That file has expired 📁',
  BLOCKED: "I can't check this one 🛑",
  NO_API_KEY: 'NLI is not set up yet 🔧',
};

const NO_RETRY: ErrorCode[] = ['BLOCKED', 'NO_API_KEY', 'FILE_EXPIRED'];

export function AssistantView({
  message,
  question,
  busy,
  onRetry,
  onFeedback,
}: {
  message: AssistantMessage;
  question?: UserMessage;
  busy: boolean;
  onRetry: () => void;
  onFeedback: (feedback: AssistantMessage['feedback']) => void;
}) {
  if (message.result) {
    return <ResultCard message={message} question={question} onFeedback={onFeedback} onRecheck={onRetry} canRecheck={!busy && !!question} />;
  }

  if (message.error) {
    const { code, message: text } = message.error;
    const canRetry = !!question && !NO_RETRY.includes(code);
    return (
      <div
        className={cn(
          'max-w-xl rounded-[28px] rounded-tl-md border-4 bg-white px-5 py-4 shadow-bubble',
          code === 'CANCELLED' ? 'border-cream-200' : 'border-verdict-false/25',
        )}
        role={code === 'CANCELLED' ? undefined : 'alert'}
      >
        <p className="font-display text-lg font-semibold text-ink">{ERROR_TITLES[code] ?? 'Oops, something went wrong 🙈'}</p>
        <p className="mt-1 text-sm text-ink-soft">{text}</p>
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={busy}
            className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-bubble hover:bg-brand-600 disabled:opacity-50"
          >
            <RefreshCw size={16} aria-hidden /> Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl rounded-[28px] rounded-tl-md border-4 border-cream-200 bg-white px-5 py-4 shadow-bubble">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-faint">Saved from an earlier version of NLI</p>
      <Markdown text={message.legacyContent ?? ''} />
    </div>
  );
}

const WAITING_TIPS = [
  '💡 Before you share something, ask: who made this, and how do they know?',
  '💡 If a post makes you feel super angry or scared, slow down. Tricksters want you to share fast.',
  '💡 Try to find the same story on two or three trusted websites.',
  '💡 Computer-made pictures often get hands, writing and reflections wrong.',
  '💡 Old photos are often shared again as if they happened today.',
  '💡 "Share this before it gets deleted!" is a big warning sign.',
  '💡 Ads can look like normal videos. Look for words like "ad" or "sponsored".',
  '💡 Opinions, like "pizza is the best", can\'t be true or false. Facts can be checked.',
]

export function PendingCard({ pending, onStop }: { pending: PendingCheck; onStop: () => void }) {
  const elapsed = useElapsed(pending.startedAt);
  const [tip, setTip] = useState(() => Math.floor(Math.random() * WAITING_TIPS.length));
  useEffect(() => {
    const timer = setInterval(() => setTip(t => (t + 1) % WAITING_TIPS.length), 7000);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    { key: 'starting', label: 'Reading what you sent 📖' },
    { key: 'researching', label: 'Hunting for clues on trusted websites 🔎' },
    { key: 'structuring', label: 'Writing your answer ✏️' },
  ];
  const current = steps.findIndex(s => s.key === pending.stage);

  return (
    <div className="rise-in flex justify-start">
      <div className="w-full max-w-md rounded-[28px] rounded-tl-md border-4 border-cream-200 bg-white px-5 py-4 shadow-bubble" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <motion.span
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-kids-blue text-white"
            aria-hidden
          >
            <Bot size={22} />
          </motion.span>
          <div className="flex-1">
            <p className="font-display text-lg font-semibold text-ink">On the case… 🕵️</p>
            <p className="flex items-center gap-1 text-xs text-ink-faint">
              <Clock3 size={12} aria-hidden /> {elapsed}s · {pending.mode === 'deep' ? 'careful checks can take up to a minute' : 'fast check'}
            </p>
          </div>
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-1.5 rounded-xl border-2 border-cream-200 px-3 py-1.5 text-xs font-bold text-ink-soft hover:bg-cream-100"
          >
            <Square size={12} fill="currentColor" aria-hidden /> Stop
          </button>
        </div>
        <ol className="mt-4 space-y-2">
          {steps.map((step, i) => (
            <li key={step.key} className="flex items-center gap-2.5 text-sm">
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                  i < current && 'bg-kids-green text-ink',
                  i === current && 'animate-pulse bg-brand-500 text-white',
                  i > current && 'bg-cream-100 text-ink-faint',
                )}
                aria-hidden
              >
                {i < current ? '✓' : i + 1}
              </span>
              <span className={cn(i === current ? 'font-bold text-ink' : i < current ? 'text-ink-soft' : 'text-ink-faint')}>{step.label}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 rounded-2xl bg-cream-100 px-3 py-2 text-xs text-ink-soft">{WAITING_TIPS[tip]}</p>
      </div>
    </div>
  );
}
