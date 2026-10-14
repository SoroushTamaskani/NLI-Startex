import { AlertCircle, ArrowRight, Award, Bot, CheckCircle2, Gamepad2, Home, Lightbulb, Medal, RotateCcw, Shield, Sparkles, Star, ThumbsDown, ThumbsUp, Trophy, X, Zap, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEscape } from '../hooks/useMisc';
import { cn } from '../lib/utils';
import { CHALLENGES, type Challenge, type Difficulty } from './academy/challenges';

type Step = 'intro' | 'difficulty' | 'quiz' | 'result' | 'achievements';

interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

const BADGES: BadgeDef[] = [
  { id: 'rookie', name: 'Truth Rookie', description: 'Get your first answer right!', icon: Medal, color: 'bg-sky-400' },
  { id: 'detective', name: 'Junior Detective', description: 'Get a perfect score on Easy!', icon: Zap, color: 'bg-green-500' },
  { id: 'ai-expert', name: 'Robot Spotter', description: 'Spot 3 AI pictures correctly!', icon: Bot, color: 'bg-purple-500' },
  { id: 'master', name: 'Truth Master', description: 'Finish the Hard rank!', icon: Award, color: 'bg-amber-500' },
  { id: 'hero', name: 'Ultimate Hero', description: 'Earn 500 points!', icon: Shield, color: 'bg-rose-500' },
];

const POINTS: Record<Difficulty, number> = { Easy: 50, Medium: 100, Hard: 150 };

const RANK_STYLE: Record<Difficulty, { card: string; pill: string; blurb: string }> = {
  Easy: { card: 'bg-kids-green/15 border-kids-green hover:bg-kids-green/30', pill: 'bg-green-600', blurb: 'Perfect for new recruits! 👶' },
  Medium: { card: 'bg-kids-yellow/15 border-kids-yellow hover:bg-kids-yellow/30', pill: 'bg-amber-600', blurb: 'For experienced detectives! 🕵️' },
  Hard: { card: 'bg-kids-pink/15 border-kids-pink hover:bg-kids-pink/30', pill: 'bg-rose-600', blurb: 'Only for Truth Masters! 🧙' },
};

function readNumber(key: string): number {
  try {
    const value = parseInt(localStorage.getItem(key) ?? '', 10);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function readBadges(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem('nli_badges') ?? '[]');
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Progress just won't be remembered.
  }
}

/** Shuffles answers so the right one isn't always in the same spot. */
function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function EducationalSection({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('intro');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [round, setRound] = useState<Challenge[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(() => readNumber('nli_points'));
  const [aiSpots, setAiSpots] = useState(() => readNumber('nli_ai_spots'));
  const [unlocked, setUnlocked] = useState<string[]>(readBadges);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEscape(true, onClose);
  useEffect(() => closeRef.current?.focus(), []);
  useEffect(() => write('nli_points', String(points)), [points]);
  useEffect(() => write('nli_ai_spots', String(aiSpots)), [aiSpots]);
  useEffect(() => write('nli_badges', JSON.stringify(unlocked)), [unlocked]);

  const unlock = (id: string) => {
    setUnlocked(prev => (prev.includes(id) ? prev : [...prev, id]));
    if (!unlocked.includes(id)) setNewBadges(prev => (prev.includes(id) ? prev : [...prev, id]));
  };

  // Badges that depend on running totals.
  useEffect(() => {
    if (points >= 500) unlock('hero');
    if (aiSpots >= 3) unlock('ai-expert');
  }, [points, aiSpots]); // eslint-disable-line react-hooks/exhaustive-deps

  const challenge = round[index];
  const chosen = challenge?.options.find(o => o.id === selected);
  const stars = useMemo(() => Array.from({ length: 5 }, (_, i) => ({ top: `${10 + ((i * 37) % 80)}%`, left: `${5 + ((i * 53) % 90)}%` })), []);

  const startRound = (level: Difficulty) => {
    setDifficulty(level);
    setRound(CHALLENGES.filter(c => c.difficulty === level).map(c => ({ ...c, options: shuffled(c.options) })));
    setIndex(0);
    setScore(0);
    setSelected(null);
    setShowHint(false);
    setNewBadges([]);
    setStep('quiz');
  };

  const answer = (optionId: string) => {
    if (selected || !challenge || !difficulty) return;
    setSelected(optionId);
    if (challenge.options.find(o => o.id === optionId)?.isCorrect) {
      setScore(s => s + 1);
      setPoints(p => p + POINTS[difficulty]);
      if (challenge.type === 'ai-vs-human') setAiSpots(n => n + 1);
      unlock('rookie');
    }
  };

  const next = () => {
    if (index < round.length - 1) {
      setIndex(i => i + 1);
      setSelected(null);
      setShowHint(false);
      return;
    }
    // `score` already includes the last answer: it was updated when the answer was picked.
    if (difficulty === 'Easy' && score === round.length) unlock('detective');
    if (difficulty === 'Hard') unlock('master');
    setStep('result');
  };

  const resetProgress = () => {
    // Confirm in the page itself: browser confirm() dialogs are blocked in some embeds.
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    setPoints(0);
    setAiSpots(0);
    setUnlocked([]);
    setNewBadges([]);
  };

  const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -16 } };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-cream font-sans"
      role="dialog"
      aria-modal="true"
      aria-label="Truth Academy"
    >
      <header className="flex items-center justify-between gap-3 border-b-4 border-cream-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep('intro')}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-kids-yellow text-ink shadow-bubble transition-transform hover:scale-105"
            aria-label="Academy home"
            title="Academy home"
          >
            <Home size={22} />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-ink sm:text-2xl">Truth Academy 🎓</h1>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-700">{points} points ✨</p>
              <button
                type="button"
                onClick={() => setStep('achievements')}
                className="rounded-full bg-kids-purple px-2 py-0.5 text-[10px] font-bold uppercase text-ink"
              >
                Badges {unlocked.length}/{BADGES.length} 🏆
              </button>
            </div>
          </div>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} className="rounded-2xl p-3 text-brand-700 hover:bg-cream-100" aria-label="Close Truth Academy">
          <X size={26} />
        </button>
      </header>

      <main className="custom-scrollbar flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center p-4 sm:p-6">
          <AnimatePresence mode="wait">
            {step === 'intro' && (
              <motion.div key="intro" {...fade} className="space-y-8 text-center">
                <div className="relative inline-block">
                  <div className="mx-auto flex h-28 w-28 rotate-3 items-center justify-center rounded-[36px] bg-kids-blue text-white shadow-lift">
                    <Gamepad2 size={56} aria-hidden />
                  </div>
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute -right-4 -top-4 flex h-11 w-11 items-center justify-center rounded-full bg-kids-pink text-white shadow-bubble"
                    aria-hidden
                  >
                    <Sparkles size={22} />
                  </motion.div>
                </div>
                <div className="space-y-3">
                  <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">Ready to become a Truth Hero? 🦸</h2>
                  <p className="mx-auto max-w-lg text-lg leading-relaxed text-ink-soft">
                    The internet is full of fun things, but sometimes people (and robots!) try to trick us. Learn the clues detectives use to spot them.
                  </p>
                </div>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setStep('difficulty')}
                    className="rounded-[28px] bg-brand-500 px-10 py-4 font-display text-xl font-semibold text-white shadow-lift transition-transform hover:scale-105 active:scale-95"
                  >
                    Start training! 🚀
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('achievements')}
                    className="rounded-[28px] border-4 border-kids-blue bg-white px-10 py-4 font-display text-xl font-semibold text-ink transition-transform hover:scale-105 active:scale-95"
                  >
                    My badges 🏆
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'difficulty' && (
              <motion.div key="difficulty" {...fade} className="w-full max-w-2xl space-y-6 text-center">
                <h2 className="font-display text-3xl font-bold text-ink">Choose your rank! 🎖️</h2>
                <div className="grid gap-4">
                  {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => startRound(level)}
                      className={cn('group flex items-center justify-between rounded-[28px] border-4 p-6 text-left transition-colors', RANK_STYLE[level].card)}
                    >
                      <div>
                        <h3 className="font-display text-2xl font-semibold text-ink">{level} rank</h3>
                        <p className="text-ink-soft">
                          {RANK_STYLE[level].blurb} · {POINTS[level]} points per answer
                        </p>
                      </div>
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-sm transition-transform group-hover:translate-x-1" aria-hidden>
                        <ArrowRight />
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'quiz' && challenge && difficulty && (
              <motion.div key={`quiz-${challenge.id}`} {...fade} className="w-full space-y-5">
                <div className="flex items-center gap-3">
                  <span className={cn('rounded-full px-3 py-1 text-xs font-bold text-white', RANK_STYLE[difficulty].pill)}>{difficulty}</span>
                  <div
                    className="h-3 flex-1 overflow-hidden rounded-full border-2 border-cream-200 bg-cream-100"
                    role="progressbar"
                    aria-valuemin={1}
                    aria-valuemax={round.length}
                    aria-valuenow={index + 1}
                    aria-label="Question progress"
                  >
                    <motion.div animate={{ width: `${((index + 1) / round.length) * 100}%` }} className="h-full bg-kids-green" />
                  </div>
                  <span className="font-display font-semibold text-ink">
                    {index + 1} / {round.length}
                  </span>
                </div>

                <div className="space-y-5 rounded-[32px] border-4 border-cream-200 bg-white p-5 shadow-lift sm:p-8">
                  <div className="space-y-2">
                    <span className="inline-block rounded-full bg-kids-purple/40 px-3 py-1 text-xs font-bold uppercase tracking-widest text-ink">{challenge.title}</span>
                    {challenge.scene && (
                      <figure className="flex items-center gap-4 rounded-3xl bg-cream-100 p-4 sm:p-5">
                        <span className="text-5xl leading-none sm:text-6xl" aria-hidden>
                          {challenge.scene.emoji}
                        </span>
                        <figcaption className="text-base leading-relaxed text-ink-soft">
                          <span className="block text-[11px] font-bold uppercase tracking-wider text-brand-700">Imagine you see this</span>
                          {challenge.scene.description}
                        </figcaption>
                      </figure>
                    )}
                    <h3 className="pt-1 font-display text-xl font-semibold leading-snug text-ink sm:text-2xl">{challenge.question}</h3>
                  </div>

                  <div className={cn('grid gap-3', challenge.options.length === 2 && 'sm:grid-cols-2')}>
                    {challenge.options.map(option => {
                      const isChosen = selected === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => answer(option.id)}
                          disabled={!!selected}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-[24px] border-4 p-4 text-left font-display text-lg font-semibold text-ink transition-colors sm:p-5',
                            isChosen && option.isCorrect && 'border-green-500 bg-kids-green/25',
                            isChosen && !option.isCorrect && 'border-kids-pink bg-kids-pink/20',
                            !isChosen && selected && option.isCorrect && 'border-green-500/60 bg-kids-green/10',
                            !selected && 'border-brand-100 bg-cream-100 hover:border-brand-500 hover:bg-white',
                            !isChosen && selected && !option.isCorrect && 'border-cream-200 bg-cream-100 opacity-60',
                          )}
                        >
                          {option.text}
                          {selected && option.isCorrect && <CheckCircle2 className="shrink-0 text-green-600" aria-label="Correct answer" />}
                          {isChosen && !option.isCorrect && <AlertCircle className="shrink-0 text-rose-500" aria-label="Your answer" />}
                        </button>
                      );
                    })}
                  </div>

                  {!selected && (
                    <div>
                      {showHint ? (
                        <p className="flex gap-2 rounded-2xl bg-kids-yellow/30 p-3 text-sm text-ink">
                          <Lightbulb size={18} className="mt-px shrink-0" aria-hidden /> {challenge.hint}
                        </p>
                      ) : (
                        <button type="button" onClick={() => setShowHint(true)} className="flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline">
                          <Lightbulb size={16} aria-hidden /> Need a hint?
                        </button>
                      )}
                    </div>
                  )}

                  {chosen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'flex items-start gap-3 rounded-[24px] border-4 p-4 text-ink',
                        chosen.isCorrect ? 'border-kids-green bg-kids-green/15' : 'border-kids-pink bg-kids-pink/10',
                      )}
                      role="status"
                    >
                      <span className="rounded-full bg-white p-2 shadow-sm">
                        {chosen.isCorrect ? <ThumbsUp className="text-green-600" aria-hidden /> : <ThumbsDown className="text-rose-500" aria-hidden />}
                      </span>
                      <div>
                        <p className="text-lg font-bold">{chosen.isCorrect ? `Yay! Correct! +${POINTS[difficulty]}` : 'Oops! Not quite.'}</p>
                        <p className="text-ink-soft">{chosen.feedback}</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {selected && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={next}
                      autoFocus
                      className="flex items-center gap-2 rounded-[22px] bg-ink px-7 py-3.5 font-display text-lg font-semibold text-white shadow-lift transition-transform hover:translate-x-1"
                    >
                      {index < round.length - 1 ? 'Next challenge' : 'See my score!'} <ArrowRight size={22} aria-hidden />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'result' && (
              <motion.div key="result" {...fade} className="space-y-8 text-center">
                <div className="relative inline-block">
                  <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-[44px] bg-kids-yellow text-white shadow-lift">
                    <Trophy size={72} aria-hidden />
                  </div>
                  {stars.map((pos, i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -16, 0], rotate: [0, 360], scale: [1, 1.2, 1] }}
                      transition={{ duration: 2 + i, repeat: Infinity, delay: i * 0.2 }}
                      className="absolute"
                      style={pos}
                      aria-hidden
                    >
                      <Star className="fill-kids-yellow text-kids-yellow" size={22} />
                    </motion.div>
                  ))}
                </div>
                <div className="space-y-3">
                  <h2 className="font-display text-4xl font-bold text-ink">{score === round.length ? 'Perfect score! 🌟' : score >= round.length / 2 ? 'Amazing job! 🌟' : 'Good try! 💪'}</h2>
                  <p className="text-2xl text-ink-soft">
                    You got <span className="font-bold text-brand-700">{score} out of {round.length}</span> right!
                  </p>
                  <p className="text-lg font-bold text-ink">Total points: {points}</p>
                </div>
                {newBadges.length > 0 && (
                  <div className="mx-auto max-w-md rounded-[28px] border-4 border-kids-purple bg-white p-4">
                    <p className="font-display text-lg font-semibold text-ink">New badge{newBadges.length > 1 ? 's' : ''} unlocked! 🎉</p>
                    <div className="mt-3 flex flex-wrap justify-center gap-3">
                      {BADGES.filter(b => newBadges.includes(b.id)).map(b => (
                        <span key={b.id} className={cn('flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold text-white', b.color)}>
                          <b.icon size={18} aria-hidden /> {b.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setStep('difficulty')}
                    className="flex w-full items-center justify-center gap-2 rounded-[22px] border-4 border-brand-100 bg-white px-8 py-3.5 font-display text-lg font-semibold text-brand-700 sm:w-auto"
                  >
                    <RotateCcw size={22} aria-hidden /> Try another rank
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('achievements')}
                    className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-kids-yellow px-8 py-3.5 font-display text-lg font-semibold text-ink shadow-lift sm:w-auto"
                  >
                    <Medal size={22} aria-hidden /> View my badges
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'achievements' && (
              <motion.div key="achievements" {...fade} className="w-full space-y-8">
                <div className="space-y-2 text-center">
                  <h2 className="font-display text-4xl font-bold text-ink">My achievements 🏆</h2>
                  <p className="text-lg text-ink-soft">Collect them all to become a Truth Legend!</p>
                </div>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {BADGES.map(badge => {
                    const has = unlocked.includes(badge.id);
                    return (
                      <li
                        key={badge.id}
                        className={cn(
                          'flex flex-col items-center space-y-3 rounded-[32px] border-4 p-6 text-center',
                          has ? 'border-cream-200 bg-white shadow-lift' : 'border-slate-200 bg-slate-100 opacity-60 grayscale',
                        )}
                      >
                        <div className={cn('flex h-20 w-20 items-center justify-center rounded-3xl text-white shadow-bubble', has ? badge.color : 'bg-slate-300')}>
                          <badge.icon size={40} aria-hidden />
                        </div>
                        <h3 className="font-display text-xl font-semibold text-ink">{badge.name}</h3>
                        <p className="text-sm leading-tight text-ink-soft">{badge.description}</p>
                        <span className={cn('rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest', has ? 'bg-kids-green/30 text-ink' : 'bg-white text-ink-faint')}>
                          {has ? 'Unlocked! ✨' : 'Locked 🔒'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex flex-col items-center gap-3">
                  <button type="button" onClick={() => setStep('intro')} className="rounded-[22px] bg-ink px-10 py-3.5 font-display text-lg font-semibold text-white shadow-lift">
                    Back to training
                  </button>
                  {(points > 0 || unlocked.length > 0) && (
                    <button
                      type="button"
                      onClick={resetProgress}
                      onBlur={() => setConfirmReset(false)}
                      className={cn(
                        'rounded-xl px-3 py-1.5 text-xs font-bold',
                        confirmReset ? 'bg-verdict-false text-white' : 'text-ink-faint hover:text-verdict-false-ink',
                      )}
                    >
                      {confirmReset ? 'Tap again to reset all points and badges' : 'Reset my progress'}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="border-t-4 border-cream-200 bg-white p-4 text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-kids-blue/15 px-4 py-2 text-sm font-bold text-ink">
          <Sparkles size={16} className="text-sky-500" aria-hidden />
          Tip: look for tiny mistakes, like extra fingers or messy writing, to spot the robots! 🤖
        </p>
      </footer>
    </motion.div>
  );
}
