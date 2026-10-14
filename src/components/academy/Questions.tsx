import { AlertCircle, CheckCircle2, Circle, CircleDot } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import type { ChoiceChallenge, CluesChallenge, SortChallenge } from './challenges';

export interface AnswerProps<T> {
  challenge: T;
  /** Called once, when the player commits an answer. */
  onAnswer: (correct: boolean, feedback: string) => void;
}

export function ChoiceQuestion({ challenge, onAnswer }: AnswerProps<ChoiceChallenge>) {
  const [selected, setSelected] = useState<string | null>(null);
  const pick = (id: string) => {
    if (selected) return;
    setSelected(id);
    const option = challenge.options.find(o => o.id === id)!;
    onAnswer(option.isCorrect, option.feedback);
  };

  return (
    <div className={cn('grid gap-3', challenge.options.length === 2 && 'sm:grid-cols-2')}>
      {challenge.options.map(option => {
        const isChosen = selected === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => pick(option.id)}
            disabled={!!selected}
            className={cn(
              'flex items-center justify-between gap-3 rounded-[22px] border-4 p-4 text-left font-display text-lg font-semibold text-ink transition-colors',
              isChosen && option.isCorrect && 'border-green-500 bg-kids-green/25',
              isChosen && !option.isCorrect && 'border-kids-pink bg-kids-pink/20',
              !isChosen && selected && option.isCorrect && 'border-green-500/60 bg-kids-green/10',
              !selected && 'border-brand-100 bg-cream-100 hover:border-brand-500 hover:bg-white',
              !isChosen && selected && !option.isCorrect && 'border-cream-200 bg-cream-100 opacity-60',
            )}
          >
            {option.text}
            {selected && option.isCorrect && <CheckCircle2 className="shrink-0 text-green-600" aria-label="Right answer" />}
            {isChosen && !option.isCorrect && <AlertCircle className="shrink-0 text-rose-500" aria-label="Your answer" />}
          </button>
        );
      })}
    </div>
  );
}

export function CluesQuestion({ challenge, onAnswer }: AnswerProps<CluesChallenge>) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState(false);

  const toggle = (id: string) => {
    if (checked) return;
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const check = () => {
    setChecked(true);
    const correct = challenge.clues.every(c => c.suspicious === picked.has(c.id));
    const found = challenge.clues.filter(c => c.suspicious && picked.has(c.id)).length;
    const total = challenge.clues.filter(c => c.suspicious).length;
    onAnswer(correct, correct ? `You found all ${total} clues! ${challenge.explain}` : `You found ${found} of ${total} clues. ${challenge.explain}`);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-ink-soft">{checked ? 'Here’s how you did:' : 'Tap all the clues you spot, then press "Check my clues".'}</p>
      <ul className="space-y-2">
        {challenge.clues.map(clue => {
          const on = picked.has(clue.id);
          const right = clue.suspicious === on;
          return (
            <li key={clue.id}>
              <button
                type="button"
                onClick={() => toggle(clue.id)}
                aria-pressed={on}
                disabled={checked}
                className={cn(
                  'flex w-full items-start gap-3 rounded-2xl border-4 p-3 text-left transition-colors',
                  !checked && (on ? 'border-brand-500 bg-brand-50' : 'border-brand-100 bg-cream-100 hover:border-brand-200'),
                  checked && right && clue.suspicious && 'border-green-500 bg-kids-green/20',
                  checked && right && !clue.suspicious && 'border-cream-200 bg-cream-100',
                  checked && !right && 'border-kids-pink bg-kids-pink/15',
                )}
              >
                <span className="mt-0.5 shrink-0" aria-hidden>
                  {checked ? (
                    clue.suspicious ? (
                      <CheckCircle2 size={20} className={on ? 'text-green-600' : 'text-verdict-misleading'} />
                    ) : (
                      <Circle size={20} className={on ? 'text-rose-500' : 'text-ink-faint'} />
                    )
                  ) : on ? (
                    <CircleDot size={20} className="text-brand-600" />
                  ) : (
                    <Circle size={20} className="text-ink-faint" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{clue.text}</span>
                  {checked && (
                    <span className="mt-0.5 block text-sm text-ink-soft">
                      <strong className={right ? 'text-green-700' : 'text-rose-600'}>
                        {clue.suspicious ? (on ? 'Good catch! ' : 'You missed this one. ') : on ? 'Not really a clue. ' : ''}
                      </strong>
                      {clue.why}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {!checked && (
        <button
          type="button"
          onClick={check}
          disabled={picked.size === 0}
          className="w-full rounded-2xl bg-brand-500 px-5 py-3 font-display text-lg font-semibold text-white shadow-bubble hover:bg-brand-600 disabled:bg-cream-300 disabled:text-ink-faint disabled:shadow-none"
        >
          Check my clues 🔎
        </button>
      )}
    </div>
  );
}

export function SortQuestion({ challenge, onAnswer }: AnswerProps<SortChallenge>) {
  const [choices, setChoices] = useState<Record<string, 0 | 1>>({});
  const [checked, setChecked] = useState(false);
  const allSorted = challenge.items.every(item => choices[item.id] !== undefined);

  const check = () => {
    setChecked(true);
    const right = challenge.items.filter(item => choices[item.id] === item.group).length;
    const correct = right === challenge.items.length;
    onAnswer(correct, correct ? `All ${right} sorted right! ${challenge.explain}` : `You sorted ${right} of ${challenge.items.length} right. ${challenge.explain}`);
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {challenge.items.map(item => {
          const choice = choices[item.id];
          const right = choice === item.group;
          return (
            <li
              key={item.id}
              className={cn(
                'rounded-2xl border-4 p-3',
                !checked && 'border-cream-200 bg-cream-100',
                checked && right && 'border-green-500 bg-kids-green/15',
                checked && !right && 'border-kids-pink bg-kids-pink/10',
              )}
            >
              <p className="font-semibold text-ink">{item.text}</p>
              <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label={`Sort: ${item.text}`}>
                {challenge.groups.map((group, g) => (
                  <button
                    key={group}
                    type="button"
                    role="radio"
                    aria-checked={choice === g}
                    disabled={checked}
                    onClick={() => setChoices(prev => ({ ...prev, [item.id]: g as 0 | 1 }))}
                    className={cn(
                      'rounded-xl border-2 px-3 py-2 text-sm font-bold transition-colors',
                      choice === g ? 'border-ink bg-ink text-white' : 'border-brand-100 bg-white text-ink hover:border-brand-500',
                      checked && item.group === g && choice !== g && 'border-green-500 text-green-700',
                    )}
                  >
                    {group}
                  </button>
                ))}
              </div>
              {checked && (
                <p className="mt-2 text-sm text-ink-soft">
                  <strong className={right ? 'text-green-700' : 'text-rose-600'}>{right ? 'Right! ' : `It’s ${challenge.groups[item.group]}. `}</strong>
                  {item.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {!checked && (
        <button
          type="button"
          onClick={check}
          disabled={!allSorted}
          className="w-full rounded-2xl bg-brand-500 px-5 py-3 font-display text-lg font-semibold text-white shadow-bubble hover:bg-brand-600 disabled:bg-cream-300 disabled:text-ink-faint disabled:shadow-none"
        >
          {allSorted ? 'Check my answers ✅' : 'Sort every sentence first'}
        </button>
      )}
    </div>
  );
}
