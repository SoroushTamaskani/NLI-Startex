import { ArrowRight, Lightbulb, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { SpeakButton } from '../SpeakButton';
import { TOPIC_LABELS, type Challenge } from './challenges';
import { ChoiceQuestion, CluesQuestion, SortQuestion } from './Questions';

export interface AnswerResult {
  challenge: Challenge;
  correct: boolean;
  usedHint: boolean;
  feedback: string;
}

function speechFor(challenge: Challenge): string {
  const parts = [challenge.scene?.description ?? '', challenge.question];
  if (challenge.kind === 'choice') parts.push(...challenge.options.map((o, i) => `Answer ${i + 1}: ${o.text}.`));
  if (challenge.kind === 'clues') parts.push(...challenge.clues.map(c => `${c.text}.`));
  if (challenge.kind === 'sort') parts.push(...challenge.items.map(i => `${i.text}`));
  return parts.filter(Boolean).join(' ');
}

/**
 * One question: the scene, the question, the answer area, a hint and the
 * feedback. `onAnswer` fires when the player answers; `onNext` when they move on.
 */
export function QuestionCard({
  challenge,
  earned,
  onAnswer,
  onNext,
  nextLabel = 'Next',
}: {
  challenge: Challenge;
  /** Points for this answer, shown in the feedback once known. */
  earned?: number;
  onAnswer: (result: AnswerResult) => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);

  const answer = (correct: boolean, feedback: string) => {
    const r = { challenge, correct, usedHint: showHint, feedback };
    setResult(r);
    onAnswer(r);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-5 rounded-[32px] border-4 border-cream-200 bg-white p-5 shadow-lift sm:p-7">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-kids-purple/40 px-3 py-1 text-xs font-bold uppercase tracking-widest text-ink">{challenge.title}</span>
            <span className="rounded-full bg-cream-100 px-3 py-1 text-xs font-bold text-ink-soft">{TOPIC_LABELS[challenge.topic]}</span>
          </div>
          {challenge.scene && (
            <figure className="flex items-center gap-4 rounded-3xl bg-cream-100 p-4 sm:p-5">
              <span className="text-5xl leading-none sm:text-6xl" aria-hidden>
                {challenge.scene.emoji}
              </span>
              <figcaption className="text-base leading-relaxed text-ink">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-brand-700">Imagine you see this</span>
                {challenge.scene.description}
              </figcaption>
            </figure>
          )}
          <h3 className="font-display text-xl font-semibold leading-snug text-ink [text-wrap:balance] sm:text-2xl">{challenge.question}</h3>
          <SpeakButton id={`q-${challenge.id}`} text={speechFor(challenge)} label="Read the question to me" className="border-cream-200" />
        </div>

        {challenge.kind === 'choice' && <ChoiceQuestion challenge={challenge} onAnswer={answer} />}
        {challenge.kind === 'clues' && <CluesQuestion challenge={challenge} onAnswer={answer} />}
        {challenge.kind === 'sort' && <SortQuestion challenge={challenge} onAnswer={answer} />}

        {!result &&
          (showHint ? (
            <p className="flex gap-2 rounded-2xl bg-kids-yellow/30 p-3 text-sm text-ink">
              <Lightbulb size={18} className="mt-px shrink-0" aria-hidden /> {challenge.hint}
            </p>
          ) : (
            <button type="button" onClick={() => setShowHint(true)} className="flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline">
              <Lightbulb size={16} aria-hidden /> Need a hint? (You'll get half the points)
            </button>
          ))}

        {result && (
          <div
            className={cn('rise-in flex items-start gap-3 rounded-[22px] border-4 p-4 text-ink', result.correct ? 'border-kids-green bg-kids-green/15' : 'border-kids-pink bg-kids-pink/10')}
            role="status"
          >
            <span className="rounded-full bg-white p-2 shadow-sm">
              {result.correct ? <ThumbsUp className="text-green-600" aria-hidden /> : <ThumbsDown className="text-rose-500" aria-hidden />}
            </span>
            <div>
              <p className="text-lg font-bold">
                {result.correct ? 'Yay! You got it!' : 'Not quite, but now you know!'}
                {result.correct && earned ? ` +${earned} points` : ''}
              </p>
              <p className="text-ink-soft">{result.feedback}</p>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onNext}
            autoFocus
            className="flex items-center gap-2 rounded-[22px] bg-ink px-7 py-3.5 font-display text-lg font-semibold text-white shadow-lift transition-transform hover:translate-x-1"
          >
            {nextLabel} <ArrowRight size={22} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
