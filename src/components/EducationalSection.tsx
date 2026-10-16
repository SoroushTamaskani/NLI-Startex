import { ArrowLeft, Flame, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEscape } from '../hooks/useMisc';
import { cn } from '../lib/utils';
import type { Challenge, Difficulty } from './academy/challenges';
import type { Lesson } from './academy/lessons';
import {
  applyAnswer,
  awardBadges,
  buildRound,
  completeDaily,
  completeLesson,
  dailyChallengeFor,
  DIFFICULTIES,
  emptyProgress,
  finishRound,
  isUnlocked,
  loadProgress,
  pointsFor,
  rankFor,
  saveProgress,
  shuffleAnswers,
  starsFor,
  type BadgeDef,
  type Progress,
} from './academy/progress';
import { QuestionCard, type AnswerResult } from './academy/QuestionCard';
import { CardScreen, HomeScreen, LessonsScreen, LessonView, PlayScreen, RoundResult, type RoundSummary } from './academy/Screens';

type Tab = 'home' | 'lessons' | 'play' | 'card';

type View =
  | { name: Tab }
  | { name: 'lesson'; lesson: Lesson }
  | { name: 'round'; difficulty: Difficulty; questions: Challenge[]; key: number }
  | { name: 'result'; summary: RoundSummary }
  | { name: 'daily'; challenge: Challenge };

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'home', label: 'Home', emoji: '🏠' },
  { id: 'lessons', label: 'Lessons', emoji: '📖' },
  { id: 'play', label: 'Play', emoji: '🎮' },
  { id: 'card', label: 'My card', emoji: '🪪' },
];

/** Plays a round, tracking the streak and the points for each answer. */
function RoundRunner({
  difficulty,
  questions,
  onAnswer,
  onFinish,
  onQuit,
}: {
  difficulty: Difficulty;
  questions: Challenge[];
  onAnswer: (result: AnswerResult, streak: number) => void;
  onFinish: (results: AnswerResult[], earned: number) => void;
  onQuit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [earnedHere, setEarnedHere] = useState<number | undefined>();
  const results = useRef<AnswerResult[]>([]);
  const total = useRef(0);

  const answer = (result: AnswerResult) => {
    const nextStreak = result.correct ? streak + 1 : 0;
    const earned = result.correct ? pointsFor(difficulty, nextStreak, result.usedHint) : 0;
    results.current.push(result);
    total.current += earned;
    setStreak(nextStreak);
    setEarnedHere(earned);
    onAnswer(result, nextStreak);
  };

  const next = () => {
    if (index < questions.length - 1) {
      setIndex(i => i + 1);
      setEarnedHere(undefined);
    } else onFinish(results.current, total.current);
  };

  const challenge = questions[index];
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onQuit} className="rounded-xl p-2 text-brand-700 hover:bg-cream-100" aria-label="Stop this round">
          <ArrowLeft size={22} />
        </button>
        <div
          className="h-3 flex-1 overflow-hidden rounded-full border-2 border-cream-200 bg-cream-100"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={questions.length}
          aria-valuenow={index + 1}
          aria-label="Question progress"
        >
          <motion.div animate={{ width: `${((index + 1) / questions.length) * 100}%` }} className="h-full bg-kids-green" />
        </div>
        <span className="font-display font-semibold tabular-nums text-ink">
          {index + 1}/{questions.length}
        </span>
        <AnimatePresence>
          {streak >= 2 && (
            <motion.span
              key={streak}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 rounded-full bg-brand-500 px-2.5 py-1 text-xs font-bold text-white"
              aria-label={`${streak} right in a row`}
            >
              <Flame size={14} aria-hidden /> {streak}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <QuestionCard
        key={challenge.id}
        challenge={challenge}
        earned={earnedHere}
        onAnswer={answer}
        onNext={next}
        nextLabel={index < questions.length - 1 ? 'Next question' : 'See my stars!'}
      />
    </div>
  );
}

export default function EducationalSection({ onClose }: { onClose: () => void }) {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [view, setView] = useState<View>({ name: 'home' });
  const [badgeAlert, setBadgeAlert] = useState<BadgeDef[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const daily = useMemo(() => shuffleAnswers(dailyChallengeFor(new Date())), []);

  useEscape(true, onClose);
  useEffect(() => closeRef.current?.focus(), []);
  useEffect(() => saveProgress(progress), [progress]);
  useEffect(() => mainRef.current?.scrollTo({ top: 0 }), [view]);
  useEffect(() => {
    if (badgeAlert.length === 0) return;
    const timer = setTimeout(() => setBadgeAlert([]), 4000);
    return () => clearTimeout(timer);
  }, [badgeAlert]);

  /** Applies a change and awards any badges it unlocks. */
  const update = (change: (p: Progress) => Progress, announce = true): BadgeDef[] => {
    const awarded = awardBadges(change(progress));
    setProgress(awarded.progress);
    if (announce && awarded.newBadges.length) setBadgeAlert(awarded.newBadges);
    return awarded.newBadges;
  };

  const startRound = (difficulty: Difficulty) => {
    if (!isUnlocked(progress, difficulty)) return;
    setView({ name: 'round', difficulty, questions: buildRound(difficulty), key: Date.now() });
  };

  const recordAnswer = (result: AnswerResult, streak: number, difficulty: Difficulty, scored: boolean) =>
    update(p => applyAnswer(p, { challenge: result.challenge, correct: result.correct, usedHint: result.usedHint, streak, difficulty, scored }).progress);

  const tab: Tab | null = ['home', 'lessons', 'play', 'card'].includes(view.name) ? (view.name as Tab) : null;
  const backTo = (name: Tab) => setView({ name });

  let body: React.ReactNode;
  switch (view.name) {
    case 'home':
      body = (
        <HomeScreen
          progress={progress}
          daily={daily}
          onDaily={() => setView({ name: 'daily', challenge: daily })}
          onLesson={lesson => setView({ name: 'lesson', lesson })}
          onPlay={startRound}
        />
      );
      break;
    case 'lessons':
      body = <LessonsScreen progress={progress} onOpen={lesson => setView({ name: 'lesson', lesson })} />;
      break;
    case 'lesson':
      body = (
        <LessonView
          key={view.lesson.id}
          lesson={view.lesson}
          onAnswer={result => recordAnswer(result, 0, 'Easy', false)}
          onComplete={() => {
            const { progress: next, earned } = completeLesson(progress, view.lesson.id);
            update(() => next);
            return earned;
          }}
          onExit={() => backTo('lessons')}
        />
      );
      break;
    case 'play':
      body = <PlayScreen progress={progress} onStart={startRound} />;
      break;
    case 'round':
      body = (
        <RoundRunner
          key={view.key}
          difficulty={view.difficulty}
          questions={view.questions}
          onAnswer={(result, streak) => recordAnswer(result, streak, view.difficulty, true)}
          onQuit={() => backTo('play')}
          onFinish={(results, earned) => {
            const score = results.filter(r => r.correct).length;
            const rankBefore = rankFor(progress.points - earned).rank;
            const newBadges = update(p => finishRound(p, view.difficulty, score, results.length), false);
            setView({
              name: 'result',
              summary: {
                difficulty: view.difficulty,
                results,
                earned,
                stars: starsFor(score, results.length),
                newBadges,
                rankBefore,
                rankAfter: rankFor(progress.points).rank,
              },
            });
          }}
        />
      );
      break;
    case 'result': {
      const level = DIFFICULTIES.indexOf(view.summary.difficulty);
      const nextLevel = DIFFICULTIES[level + 1];
      body = (
        <RoundResult
          summary={view.summary}
          progress={progress}
          onAgain={() => startRound(view.summary.difficulty)}
          onNextRank={nextLevel && isUnlocked(progress, nextLevel) ? () => startRound(nextLevel) : undefined}
          onRanks={() => backTo('play')}
        />
      );
      break;
    }
    case 'daily':
      body = (
        <div className="w-full space-y-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => backTo('home')} className="rounded-xl p-2 text-brand-700 hover:bg-cream-100" aria-label="Back">
              <ArrowLeft size={22} />
            </button>
            <p className="font-display text-lg font-semibold text-ink">📅 Today's daily challenge</p>
          </div>
          <QuestionCard
            challenge={view.challenge}
            onAnswer={result =>
              update(p => {
                const counted = applyAnswer(p, {
                  challenge: result.challenge,
                  correct: result.correct,
                  usedHint: result.usedHint,
                  streak: 0,
                  difficulty: result.challenge.difficulty,
                  scored: false,
                }).progress;
                return completeDaily(counted, new Date(), result.correct).progress;
              })
            }
            onNext={() => backTo('home')}
            nextLabel="Done"
          />
          <p className="text-center text-sm text-ink-soft">A right answer earns 50 points. Just trying earns 10!</p>
        </div>
      );
      break;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-cream font-sans"
      role="dialog"
      aria-modal="true"
      aria-label="Truth Academy"
    >
      <header className="border-b-4 border-cream-200 bg-white px-4 pt-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-kids-yellow text-2xl shadow-bubble" aria-hidden>
              🎓
            </span>
            <div>
              <h1 className="font-display text-xl font-bold leading-tight text-ink sm:text-2xl">Truth Academy</h1>
              <p className="text-xs font-bold text-brand-700">
                {rankFor(progress.points).rank.emoji} {rankFor(progress.points).rank.title} · {progress.points} points
              </p>
            </div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="rounded-2xl p-2.5 text-brand-700 hover:bg-cream-100" aria-label="Close Truth Academy">
            <X size={26} />
          </button>
        </div>
        <nav className="mx-auto mt-2 flex max-w-3xl gap-1" aria-label="Academy sections">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setView({ name: t.id })}
              aria-current={tab === t.id ? 'page' : undefined}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-t-2xl border-b-4 px-2 py-2 text-sm font-bold transition-colors',
                tab === t.id ? 'border-brand-500 text-ink' : 'border-transparent text-ink-soft hover:text-ink',
              )}
            >
              <span aria-hidden>{t.emoji}</span>
              <span className="hidden min-[420px]:inline">{t.label}</span>
              <span className="sr-only min-[420px]:hidden">{t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main ref={mainRef} className="custom-scrollbar flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center px-4 py-6 sm:px-6">
          <div
            key={view.name === 'round' ? `round-${view.key}` : view.name === 'lesson' ? `lesson-${view.lesson.id}` : view.name}
            className="rise-in w-full"
          >
            {view.name === 'card' ? <CardScreen progress={progress} onReset={() => setProgress(emptyProgress())} /> : body}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {badgeAlert.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pointer-events-none fixed inset-x-0 top-24 z-[120] flex justify-center px-4"
            role="status"
          >
            <div className="flex items-center gap-3 rounded-2xl border-4 border-kids-purple bg-white px-4 py-3 shadow-lift">
              <span className="text-3xl" aria-hidden>
                {badgeAlert[0].emoji}
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-700">New badge!</p>
                <p className="font-display text-lg font-semibold text-ink">{badgeAlert.map(b => b.name).join(', ')}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
