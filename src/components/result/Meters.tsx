import { Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AI_LABELS, trustLabel } from '../../lib/verdicts';
import type { AiCheck } from '../../types';

export function TrustMeter({ score }: { score: number }) {
  const color = score >= 60 ? 'bg-verdict-true' : score > 40 ? 'bg-verdict-misleading' : 'bg-verdict-false';
  return (
    <div className="rounded-2xl border-2 border-cream-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-ink">Trust meter 📈</h4>
        <span className="font-display text-lg font-semibold text-ink">
          {score}
          <span className="text-xs text-ink-faint">/100</span>
        </span>
      </div>
      <div
        className="relative mt-2 h-3 overflow-hidden rounded-full bg-gradient-to-r from-verdict-false-soft via-verdict-misleading-soft to-verdict-true-soft"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-label="How likely this is to be true"
      >
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${Math.max(4, score)}%` }} />
      </div>
      <p className="mt-2 text-xs font-semibold text-ink-soft">{trustLabel(score)}</p>
    </div>
  );
}

export function RobotMeter({ check }: { check: AiCheck }) {
  const { label, emoji } = AI_LABELS[check.assessment];
  const tone =
    check.assessment === 'LIKELY_AI' ? 'bg-verdict-mixed' : check.assessment === 'LIKELY_HUMAN' ? 'bg-kids-blue' : 'bg-verdict-unknown';
  return (
    <div className="rounded-2xl border-2 border-cream-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-ink">Robot check 🤖</h4>
        <span className="text-xs font-semibold text-ink-soft">{check.confidence}% sure</span>
      </div>
      <p className="mt-1 font-display text-base font-semibold text-ink">
        {emoji} {label}
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-100" aria-hidden>
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${Math.max(4, check.confidence)}%` }} />
      </div>
      {check.signals.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-ink-soft">
          {check.signals.map(signal => (
            <li key={signal} className="flex gap-1.5">
              <span aria-hidden>🔎</span>
              <span>{signal}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 flex gap-1.5 text-[11px] leading-snug text-ink-faint">
        <Info size={13} className="mt-px shrink-0" aria-hidden />
        Robot checks are best guesses. Even experts and special tools can be fooled.
      </p>
    </div>
  );
}
