import { cn } from '../lib/utils';
import type { Audience } from '../types';

export const AUDIENCES: { value: Audience; label: string; emoji: string; hint: string }[] = [
  { value: 'young', label: 'Ages 6–8', emoji: '🧒', hint: 'Very short sentences and easy words' },
  { value: 'kid', label: 'Ages 9–12', emoji: '🧑', hint: 'Short, friendly explanations' },
  { value: 'teen', label: '13 and up', emoji: '🧑‍🎓', hint: 'More detail, normal words' },
];

/** "Who's checking?" Answers are written for the age picked here. */
export function AgePicker({ value, onChange, compact = false }: { value: Audience; onChange: (value: Audience) => void; compact?: boolean }) {
  return (
    <fieldset className={cn('w-full', compact ? '' : 'max-w-md')}>
      <legend className={cn('mb-2 font-bold text-ink', compact ? 'text-xs' : 'w-full text-center text-sm')}>Who's checking?</legend>
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-cream-300/50 p-1">
        {AUDIENCES.map(option => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              title={option.hint}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-center transition-colors focus-within:outline focus-within:outline-3 focus-within:outline-brand-500',
                selected ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:bg-white/60',
              )}
            >
              <input
                type="radio"
                name={compact ? 'audience-compact' : 'audience'}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className={compact ? 'text-base' : 'text-xl'} aria-hidden>
                {option.emoji}
              </span>
              <span className={cn('whitespace-nowrap font-bold', compact ? 'text-[11px]' : 'text-xs')}>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
