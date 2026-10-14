import { Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AI_LABELS, trustLabel, trustLevel } from '../../lib/verdicts';
import type { AiCheck } from '../../types';

const FACES = [
  { emoji: '😬', label: 'false' },
  { emoji: '🙁', label: 'mostly false' },
  { emoji: '😐', label: 'not sure' },
  { emoji: '🙂', label: 'mostly true' },
  { emoji: '😄', label: 'true' },
];

/** A truth-o-meter kids can read without knowing what "6/100" means: five faces and a pointer. */
export function TrustMeter({ score }: { score: number }) {
  const active = trustLevel(score);
  return (
    <div className="rounded-2xl border-2 border-cream-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-bold text-ink">Truth-o-meter</h4>
        <span className="text-[11px] font-semibold text-ink-faint">{score} out of 100</span>
      </div>
      <div
        className="mt-3"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-valuetext={`${trustLabel(score)}, ${score} out of 100`}
        aria-label="How likely this is to be true"
      >
        <div className="flex justify-between px-0.5" aria-hidden>
          {FACES.map((face, i) => (
            <span
              key={face.label}
              className={cn('text-2xl transition-all duration-500', i === active ? 'scale-125' : 'opacity-35 grayscale')}
              title={face.label}
            >
              {face.emoji}
            </span>
          ))}
        </div>
        <div className="relative mt-2 h-3 rounded-full bg-gradient-to-r from-verdict-false via-verdict-misleading to-verdict-true" aria-hidden>
          <span
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-ink shadow transition-all duration-700"
            style={{ left: `${Math.min(97, Math.max(3, score))}%` }}
          />
        </div>
      </div>
      <p className="mt-2 text-sm font-bold text-ink">{trustLabel(score)}</p>
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
        <h4 className="text-sm font-bold text-ink">Made by a computer?</h4>
        <span className="text-[11px] font-semibold text-ink-faint">{check.confidence}% sure</span>
      </div>
      <p className="mt-2 font-display text-lg font-semibold text-ink">
        <span aria-hidden>{emoji}</span> {label}
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-100" aria-hidden>
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${Math.max(4, check.confidence)}%` }} />
      </div>
      {check.signals.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Clues I spotted</p>
          <ul className="mt-1 space-y-1 text-sm text-ink-soft">
            {check.signals.map(signal => (
              <li key={signal} className="flex gap-1.5">
                <span aria-hidden>🔎</span>
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 flex gap-1.5 text-xs leading-snug text-ink-soft">
        <Info size={14} className="mt-px shrink-0" aria-hidden />
        This is my best guess. Computer-made pictures and voices can fool anyone, even experts.
      </p>
    </div>
  );
}
