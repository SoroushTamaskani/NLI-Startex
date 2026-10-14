import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Flame, Lock, Play, RotateCcw, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { SpeakButton } from '../SpeakButton';
import { TOPIC_LABELS, type Challenge, type Difficulty } from './challenges';
import { Confetti } from './Confetti';
import { LESSONS, type Lesson } from './lessons';
import {
  BADGES,
  DIFFICULTIES,
  LESSON_POINTS,
  QUESTIONS_PER_ROUND,
  dailyDone,
  isUnlocked,
  rankFor,
  type BadgeDef,
  type Progress,
  type Rank,
} from './progress';
import { QuestionCard, type AnswerResult } from './QuestionCard';

const RANK_STYLE: Record<Difficulty, { card: string; pill: string; blurb: string; emoji: string }> = {
  Easy: { card: 'border-kids-green bg-kids-green/15', pill: 'bg-green-600', blurb: 'For new recruits', emoji: '🐣' },
  Medium: { card: 'border-kids-yellow bg-kids-yellow/15', pill: 'bg-amber-600', blurb: 'For experienced detectives', emoji: '🕵️' },
  Hard: { card: 'border-kids-pink bg-kids-pink/15', pill: 'bg-rose-600', blurb: 'For Truth Masters', emoji: '🧙' },
};

export function Stars({ count, size = 20 }: { count: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${count} out of 3 stars`}>
      {[0, 1, 2].map(i => (
        <Star key={i} size={size} className={i < count ? 'fill-kids-yellow text-amber-500' : 'text-cream-300'} aria-hidden />
      ))}
    </span>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-[28px] border-4 border-cream-200 bg-white p-5 shadow-bubble', className)}>{children}</div>;
}

export function RankCard({ points }: { points: number }) {
  const { rank, next, progress } = rankFor(points);
  return (
    <Panel className="flex items-center gap-4">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-kids-blue/30 text-4xl" aria-hidden>
        {rank.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-700">Your rank</p>
        <p className="font-display text-2xl font-bold text-ink">{rank.title}</p>
        <div
          className="mt-2 h-3 overflow-hidden rounded-full bg-cream-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label={next ? `Progress to ${next.title}` : 'Top rank reached'}
        >
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }} className="h-full rounded-full bg-kids-green" />
        </div>
        <p className="mt-1 text-xs font-semibold text-ink-soft">
          {points} points · {next ? `${next.minPoints - points} more to become ${next.title} ${next.emoji}` : 'You reached the top rank!'}
        </p>
      </div>
    </Panel>
  );
}

// ─── Home ───

export function HomeScreen({
  progress,
  daily,
  onDaily,
  onLesson,
  onPlay,
}: {
  progress: Progress;
  daily: Challenge;
  onDaily: () => void;
  onLesson: (lesson: Lesson) => void;
  onPlay: (difficulty: Difficulty) => void;
}) {
  const doneToday = dailyDone(progress, new Date());
  const nextLesson = LESSONS.find(l => !progress.lessonsDone.includes(l.id));
  const suggested = [...DIFFICULTIES].reverse().find(d => isUnlocked(progress, d) && progress.stars[d] < 3) ?? 'Hard';

  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <h2 className="font-display text-3xl font-bold text-ink [text-wrap:balance]">Welcome to Truth Academy! 🎓</h2>
        <p className="mx-auto mt-1 max-w-lg text-ink-soft">Learn the clues real fact-checkers use, then test your skills to earn stars, badges and new ranks.</p>
      </div>
      <RankCard points={progress.points} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel className={cn('flex flex-col gap-3', !doneToday && 'border-kids-yellow')}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-lg font-semibold text-ink">📅 Daily challenge</p>
            {progress.daily.streak > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
                <Flame size={14} aria-hidden /> {progress.daily.streak} day{progress.daily.streak === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <p className="text-sm text-ink-soft">
            {doneToday ? 'Done for today! A new question appears tomorrow.' : `One question a day. Today: ${TOPIC_LABELS[daily.topic]}. Worth up to 50 points!`}
          </p>
          <button
            type="button"
            onClick={onDaily}
            disabled={doneToday}
            className="mt-auto flex items-center justify-center gap-2 rounded-2xl bg-kids-yellow px-4 py-2.5 font-display font-semibold text-ink shadow-bubble hover:brightness-95 disabled:bg-cream-100 disabled:text-ink-faint disabled:shadow-none"
          >
            {doneToday ? (
              <>
                <CheckCircle2 size={18} aria-hidden /> Completed
              </>
            ) : (
              <>
                <Play size={18} aria-hidden /> Play today's question
              </>
            )}
          </button>
        </Panel>

        <Panel className="flex flex-col gap-3">
          <p className="font-display text-lg font-semibold text-ink">📖 {nextLesson ? 'Next lesson' : 'All lessons done!'}</p>
          <p className="text-sm text-ink-soft">
            {nextLesson ? `${nextLesson.emoji} ${nextLesson.title}: ${nextLesson.blurb}. +${LESSON_POINTS} points` : 'You finished every lesson. Amazing! You can read them again any time.'}
          </p>
          <button
            type="button"
            onClick={() => onLesson(nextLesson ?? LESSONS[0])}
            className="mt-auto flex items-center justify-center gap-2 rounded-2xl bg-kids-blue px-4 py-2.5 font-display font-semibold text-ink shadow-bubble hover:brightness-95"
          >
            <BookOpen size={18} aria-hidden /> {nextLesson ? 'Start the lesson' : 'Read a lesson again'}
          </button>
        </Panel>
      </div>

      <button
        type="button"
        onClick={() => onPlay(suggested)}
        className="flex w-full items-center justify-between gap-3 rounded-[28px] bg-brand-500 px-6 py-5 text-left text-white shadow-lift transition-transform hover:scale-[1.01]"
      >
        <span>
          <span className="block font-display text-2xl font-semibold">Play a round 🚀</span>
          <span className="block text-sm text-white/90">
            {QUESTIONS_PER_ROUND} questions on the {suggested} rank
          </span>
        </span>
        <ArrowRight size={28} aria-hidden />
      </button>
    </div>
  );
}

// ─── Lessons ───

export function LessonsScreen({ progress, onOpen }: { progress: Progress; onOpen: (lesson: Lesson) => void }) {
  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <h2 className="font-display text-3xl font-bold text-ink">Detective lessons 📖</h2>
        <p className="mt-1 text-ink-soft">
          Short lessons with a quick check at the end. {progress.lessonsDone.length} of {LESSONS.length} done.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {LESSONS.map((lesson, i) => {
          const done = progress.lessonsDone.includes(lesson.id);
          return (
            <li key={lesson.id}>
              <button
                type="button"
                onClick={() => onOpen(lesson)}
                className="flex h-full w-full items-start gap-3 rounded-[24px] border-4 border-cream-200 bg-white p-4 text-left transition-colors hover:border-brand-200"
              >
                <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl', lesson.color)} aria-hidden>
                  {lesson.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-faint">Lesson {i + 1}</span>
                  <span className="block font-display text-lg font-semibold leading-tight text-ink">{lesson.title}</span>
                  <span className="mt-0.5 block text-sm text-ink-soft">{lesson.blurb}</span>
                </span>
                {done ? (
                  <CheckCircle2 className="shrink-0 text-green-600" aria-label="Done" />
                ) : (
                  <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">+{LESSON_POINTS}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function LessonView({
  lesson,
  onAnswer,
  onComplete,
  onExit,
}: {
  lesson: Lesson;
  onAnswer: (result: AnswerResult) => void;
  onComplete: () => number;
  onExit: () => void;
}) {
  const [step, setStep] = useState(0);
  const [earned, setEarned] = useState<number | null>(null);
  const slides = lesson.slides.length;
  const total = slides + lesson.quiz.length;
  const slide = lesson.slides[step];
  const question = step >= slides ? lesson.quiz[step - slides] : undefined;

  const next = () => {
    if (step < total - 1) setStep(s => s + 1);
    else setEarned(onComplete());
  };

  if (earned !== null) {
    return (
      <div className="w-full space-y-6 text-center">
        <span className="text-6xl" aria-hidden>
          🎉
        </span>
        <h2 className="font-display text-3xl font-bold text-ink">Lesson complete!</h2>
        <p className="text-lg text-ink-soft">
          You finished <strong className="text-ink">{lesson.title}</strong>.
          {earned > 0 ? ` +${earned} points!` : ' You already had the points for this one.'}
        </p>
        <button type="button" onClick={onExit} className="rounded-[22px] bg-ink px-8 py-3.5 font-display text-lg font-semibold text-white shadow-lift">
          Back to lessons
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onExit} className="rounded-xl p-2 text-brand-700 hover:bg-cream-100" aria-label="Back to lessons">
          <ArrowLeft size={22} />
        </button>
        <p className="min-w-0 flex-1 truncate font-display text-lg font-semibold text-ink">
          {lesson.emoji} {lesson.title}
        </p>
        <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={cn('h-2.5 w-2.5 rounded-full', i <= step ? 'bg-brand-500' : 'bg-cream-300', i >= slides && 'rounded-sm')} aria-hidden />
          ))}
        </div>
      </div>

      {slide && (
        <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
          <Panel className="space-y-4 text-center sm:p-8">
            <span className={cn('mx-auto flex h-24 w-24 items-center justify-center rounded-[32px] text-6xl', lesson.color)} aria-hidden>
              {slide.emoji}
            </span>
            <h3 className="font-display text-2xl font-bold text-ink">{slide.title}</h3>
            <p className="mx-auto max-w-prose text-lg leading-relaxed text-ink">{slide.text}</p>
            <SpeakButton id={`slide-${lesson.id}-${step}`} text={`${slide.title}. ${slide.text}`} className="border-cream-200" />
          </Panel>
          <div className="flex justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-2 rounded-[20px] border-4 border-cream-200 bg-white px-5 py-3 font-display font-semibold text-ink disabled:opacity-40"
            >
              <ArrowLeft size={20} aria-hidden /> Back
            </button>
            <button type="button" onClick={next} className="flex items-center gap-2 rounded-[20px] bg-ink px-6 py-3 font-display font-semibold text-white shadow-lift">
              {step === slides - 1 ? 'Quick check ✏️' : 'Next'} <ArrowRight size={20} aria-hidden />
            </button>
          </div>
        </motion.div>
      )}

      {question && (
        <QuestionCard key={question.id} challenge={question} onAnswer={onAnswer} onNext={next} nextLabel={step === total - 1 ? 'Finish lesson' : 'Next'} />
      )}
    </div>
  );
}

// ─── Play ───

export function PlayScreen({ progress, onStart }: { progress: Progress; onStart: (difficulty: Difficulty) => void }) {
  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <h2 className="font-display text-3xl font-bold text-ink">Choose your rank 🎖️</h2>
        <p className="mt-1 text-ink-soft">Get at least 1 star to unlock the next rank. Each round has {QUESTIONS_PER_ROUND} new questions.</p>
      </div>
      <div className="grid gap-3">
        {DIFFICULTIES.map((level, i) => {
          const unlocked = isUnlocked(progress, level);
          const style = RANK_STYLE[level];
          return (
            <button
              key={level}
              type="button"
              onClick={() => unlocked && onStart(level)}
              disabled={!unlocked}
              className={cn(
                'group flex items-center gap-4 rounded-[28px] border-4 p-5 text-left transition-colors',
                unlocked ? style.card : 'border-cream-200 bg-cream-100 opacity-70',
              )}
            >
              <span className="text-4xl" aria-hidden>
                {unlocked ? style.emoji : '🔒'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-2xl font-semibold text-ink">{level} rank</span>
                <span className="block text-sm text-ink-soft">
                  {unlocked ? style.blurb : `Get 1 star on ${DIFFICULTIES[i - 1]} to unlock`}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1">
                {unlocked ? <Stars count={progress.stars[level]} /> : <Lock className="text-ink-faint" aria-hidden />}
                {unlocked && (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-sm transition-transform group-hover:translate-x-1" aria-hidden>
                    <ArrowRight />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface RoundSummary {
  difficulty: Difficulty;
  results: AnswerResult[];
  earned: number;
  stars: number;
  newBadges: BadgeDef[];
  rankBefore: Rank;
  rankAfter: Rank;
}

export function RoundResult({
  summary,
  progress,
  onAgain,
  onNextRank,
  onRanks,
}: {
  summary: RoundSummary;
  progress: Progress;
  onAgain: () => void;
  onNextRank?: () => void;
  onRanks: () => void;
}) {
  const score = summary.results.filter(r => r.correct).length;
  const total = summary.results.length;
  const missed = summary.results.filter(r => !r.correct);
  const rankUp = summary.rankAfter.title !== summary.rankBefore.title;
  const title = summary.stars === 3 ? 'Perfect round! 🌟' : summary.stars === 2 ? 'Amazing job! 🎉' : summary.stars === 1 ? 'Nice work! 👍' : 'Good try! 💪';

  return (
    <div className="w-full space-y-6 text-center">
      {summary.stars === 3 && <Confetti />}
      <div className="space-y-3">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
          <Stars count={summary.stars} size={48} />
        </motion.div>
        <h2 className="font-display text-4xl font-bold text-ink">{title}</h2>
        <p className="text-xl text-ink-soft">
          You got <strong className="text-brand-700">{score} out of {total}</strong> right and earned <strong className="text-ink">{summary.earned} points</strong>.
        </p>
        {summary.stars === 0 && (
          <p className="text-ink-soft">Get 3 or more right to earn a star. Read the notes below and try again!</p>
        )}
      </div>

      {rankUp && (
        <Panel className="mx-auto max-w-md border-kids-blue">
          <p className="font-display text-xl font-semibold text-ink">
            {summary.rankAfter.emoji} Rank up! You're now a {summary.rankAfter.title}!
          </p>
        </Panel>
      )}

      {summary.newBadges.length > 0 && (
        <Panel className="mx-auto max-w-md border-kids-purple">
          <p className="font-display text-lg font-semibold text-ink">New badge{summary.newBadges.length > 1 ? 's' : ''}! 🎉</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {summary.newBadges.map(b => (
              <span key={b.id} className="flex items-center gap-2 rounded-2xl bg-kids-purple/40 px-3 py-2 text-sm font-bold text-ink">
                <span aria-hidden>{b.emoji}</span> {b.name}
              </span>
            ))}
          </div>
        </Panel>
      )}

      {missed.length > 0 && (
        <Panel className="text-left">
          <p className="font-display text-lg font-semibold text-ink">📒 Detective notebook: what to remember</p>
          <ul className="mt-3 space-y-3">
            {missed.map(r => (
              <li key={r.challenge.id} className="rounded-2xl bg-cream-100 p-3">
                <p className="font-bold text-ink">{r.challenge.question}</p>
                <p className="mt-1 text-sm text-ink-soft">{r.feedback}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onAgain}
          className="flex items-center justify-center gap-2 rounded-[22px] border-4 border-brand-100 bg-white px-7 py-3.5 font-display text-lg font-semibold text-brand-700"
        >
          <RotateCcw size={20} aria-hidden /> Play again
        </button>
        {onNextRank && (
          <button
            type="button"
            onClick={onNextRank}
            className="flex items-center justify-center gap-2 rounded-[22px] bg-brand-500 px-7 py-3.5 font-display text-lg font-semibold text-white shadow-lift"
          >
            Next rank <ArrowRight size={20} aria-hidden />
          </button>
        )}
        <button type="button" onClick={onRanks} className="rounded-[22px] bg-ink px-7 py-3.5 font-display text-lg font-semibold text-white shadow-lift">
          All ranks
        </button>
      </div>
      <p className="text-sm text-ink-faint">Total: {progress.points} points</p>
    </div>
  );
}

// ─── My detective card ───

export function CardScreen({ progress, onReset }: { progress: Progress; onReset: () => void }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const accuracy = progress.answered ? Math.round((progress.correct / progress.answered) * 100) : 0;
  const totalStars = DIFFICULTIES.reduce((sum, d) => sum + progress.stars[d], 0);
  const stats = [
    { label: 'Points', value: progress.points.toLocaleString() },
    { label: 'Right answers', value: progress.answered ? `${accuracy}%` : '–' },
    { label: 'Best streak', value: `🔥 ${progress.bestStreak}` },
    { label: 'Stars', value: `⭐ ${totalStars}/9` },
    { label: 'Lessons', value: `${progress.lessonsDone.length}/${LESSONS.length}` },
    { label: 'Badges', value: `${progress.badges.length}/${BADGES.length}` },
  ];

  return (
    <div className="w-full space-y-5">
      <div className="text-center">
        <h2 className="font-display text-3xl font-bold text-ink">My detective card 🪪</h2>
      </div>
      <RankCard points={progress.points} />
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(stat => (
          <div key={stat.label} className="rounded-2xl border-2 border-cream-200 bg-white p-3 text-center">
            <dt className="text-xs font-bold uppercase tracking-wider text-ink-faint">{stat.label}</dt>
            <dd className="font-display text-2xl font-semibold tabular-nums text-ink">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <h3 className="mb-3 font-display text-xl font-semibold text-ink">Badges 🏆</h3>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BADGES.map(badge => {
            const has = progress.badges.includes(badge.id);
            return (
              <li
                key={badge.id}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-[24px] border-4 p-4 text-center',
                  has ? 'border-kids-purple bg-white shadow-bubble' : 'border-cream-200 bg-cream-100',
                )}
              >
                <span className={cn('text-4xl', !has && 'opacity-30 grayscale')} aria-hidden>
                  {has ? badge.emoji : '🔒'}
                </span>
                <span className="font-display font-semibold leading-tight text-ink">{badge.name}</span>
                <span className="text-xs leading-snug text-ink-soft">{badge.description}</span>
                <span className="sr-only">{has ? 'Unlocked' : 'Locked'}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {progress.points > 0 && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              if (confirmReset) {
                setConfirmReset(false);
                onReset();
              } else setConfirmReset(true);
            }}
            onBlur={() => setConfirmReset(false)}
            className={cn('rounded-xl px-3 py-1.5 text-xs font-bold', confirmReset ? 'bg-verdict-false text-white' : 'text-ink-faint hover:text-verdict-false-ink')}
          >
            {confirmReset ? 'Tap again to reset all points and badges' : 'Reset my progress'}
          </button>
        </div>
      )}
    </div>
  );
}
