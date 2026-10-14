/**
 * Truth Academy progress: points, ranks, stars, streaks, badges and the daily
 * challenge. Everything here is pure so it can be tested; the component only
 * loads, updates and saves a Progress object.
 */
import { CHALLENGES, type Challenge, type Difficulty, type Topic } from './challenges';
import { LESSONS } from './lessons';

export const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];
export const QUESTIONS_PER_ROUND = 6;
export const LESSON_POINTS = 30;
export const DAILY_POINTS = 50;
const BASE_POINTS: Record<Difficulty, number> = { Easy: 50, Medium: 100, Hard: 150 };
const STORAGE_KEY = 'nli_academy_v2';

export interface Progress {
  points: number;
  answered: number;
  correct: number;
  bestStreak: number;
  /** Best star rating (0–3) earned on each rank. */
  stars: Record<Difficulty, number>;
  lessonsDone: string[];
  badges: string[];
  topicCorrect: Partial<Record<Topic, number>>;
  kindCorrect: { clues: number; sort: number };
  daily: { lastDate: string | null; streak: number };
}

export function emptyProgress(): Progress {
  return {
    points: 0,
    answered: 0,
    correct: 0,
    bestStreak: 0,
    stars: { Easy: 0, Medium: 0, Hard: 0 },
    lessonsDone: [],
    badges: [],
    topicCorrect: {},
    kindCorrect: { clues: 0, sort: 0 },
    daily: { lastDate: null, streak: 0 },
  };
}

// ─── Ranks ───

export interface Rank {
  title: string;
  emoji: string;
  minPoints: number;
}

export const RANKS: Rank[] = [
  { title: 'Rookie Detective', emoji: '🐣', minPoints: 0 },
  { title: 'Junior Detective', emoji: '🔍', minPoints: 300 },
  { title: 'Detective', emoji: '🕵️', minPoints: 800 },
  { title: 'Senior Detective', emoji: '🎖️', minPoints: 1500 },
  { title: 'Truth Master', emoji: '🧙', minPoints: 2500 },
  { title: 'Truth Legend', emoji: '🏆', minPoints: 4000 },
];

export function rankFor(points: number): { rank: Rank; next?: Rank; progress: number } {
  let index = 0;
  RANKS.forEach((rank, i) => {
    if (points >= rank.minPoints) index = i;
  });
  const rank = RANKS[index];
  const next = RANKS[index + 1];
  const progress = next ? (points - rank.minPoints) / (next.minPoints - rank.minPoints) : 1;
  return { rank, next, progress: Math.max(0, Math.min(1, progress)) };
}

// ─── Scoring ───

/** Points for one correct answer: harder ranks score more, streaks add a bonus, hints halve it. */
export function pointsFor(difficulty: Difficulty, streak: number, usedHint: boolean): number {
  const base = BASE_POINTS[difficulty];
  const bonus = Math.min(50, Math.max(0, streak - 1) * 10);
  return Math.round((usedHint ? base / 2 : base) + bonus);
}

export function starsFor(score: number, total: number): number {
  if (total === 0) return 0;
  if (score === total) return 3;
  if (score / total >= 2 / 3) return 2;
  if (score / total >= 0.5) return 1;
  return 0;
}

export function isUnlocked(progress: Progress, difficulty: Difficulty): boolean {
  const index = DIFFICULTIES.indexOf(difficulty);
  return index === 0 || progress.stars[DIFFICULTIES[index - 1]] >= 1;
}

export function applyAnswer(
  progress: Progress,
  answer: { challenge: Challenge; correct: boolean; streak: number; usedHint: boolean; difficulty: Difficulty; scored?: boolean },
): { progress: Progress; earned: number } {
  // Unscored answers (lesson checks, the daily challenge) still count towards stats and badges.
  const earned = answer.correct && answer.scored !== false ? pointsFor(answer.difficulty, answer.streak, answer.usedHint) : 0;
  const next: Progress = {
    ...progress,
    points: progress.points + earned,
    answered: progress.answered + 1,
    correct: progress.correct + (answer.correct ? 1 : 0),
    bestStreak: Math.max(progress.bestStreak, answer.correct ? answer.streak : 0),
    topicCorrect: answer.correct
      ? { ...progress.topicCorrect, [answer.challenge.topic]: (progress.topicCorrect[answer.challenge.topic] ?? 0) + 1 }
      : progress.topicCorrect,
    kindCorrect:
      answer.correct && answer.challenge.kind !== 'choice'
        ? { ...progress.kindCorrect, [answer.challenge.kind]: progress.kindCorrect[answer.challenge.kind] + 1 }
        : progress.kindCorrect,
  };
  return { progress: next, earned };
}

export function finishRound(progress: Progress, difficulty: Difficulty, score: number, total: number): Progress {
  const stars = starsFor(score, total);
  return { ...progress, stars: { ...progress.stars, [difficulty]: Math.max(progress.stars[difficulty], stars) } };
}

export function completeLesson(progress: Progress, lessonId: string): { progress: Progress; earned: number } {
  if (progress.lessonsDone.includes(lessonId)) return { progress, earned: 0 };
  return {
    progress: { ...progress, points: progress.points + LESSON_POINTS, lessonsDone: [...progress.lessonsDone, lessonId] },
    earned: LESSON_POINTS,
  };
}

// ─── Daily challenge ───

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** The same question for everyone on a given day. */
export function dailyChallengeFor(date: Date, challenges: Challenge[] = CHALLENGES): Challenge {
  const key = dateKey(date);
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return challenges[hash % challenges.length];
}

export function dailyDone(progress: Progress, date: Date): boolean {
  return progress.daily.lastDate === dateKey(date);
}

export function completeDaily(progress: Progress, date: Date, correct: boolean): { progress: Progress; earned: number } {
  if (dailyDone(progress, date)) return { progress, earned: 0 };
  const yesterday = new Date(date);
  yesterday.setDate(date.getDate() - 1);
  const streak = progress.daily.lastDate === dateKey(yesterday) ? progress.daily.streak + 1 : 1;
  const earned = correct ? DAILY_POINTS : 10;
  return {
    progress: { ...progress, points: progress.points + earned, daily: { lastDate: dateKey(date), streak } },
    earned,
  };
}

// ─── Badges ───

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  earned: (p: Progress) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: 'rookie', name: 'Truth Rookie', emoji: '🥉', description: 'Get your first answer right', earned: p => p.correct >= 1 },
  { id: 'student', name: 'Eager Learner', emoji: '📖', description: 'Finish your first lesson', earned: p => p.lessonsDone.length >= 1 },
  { id: 'scholar', name: 'Detective Scholar', emoji: '🎓', description: 'Finish every lesson', earned: p => LESSONS.every(l => p.lessonsDone.includes(l.id)) },
  { id: 'detective', name: 'Junior Detective', emoji: '⭐', description: 'Get 3 stars on Easy', earned: p => p.stars.Easy >= 3 },
  { id: 'medium-stars', name: 'Sharp Eyes', emoji: '👀', description: 'Get 3 stars on Medium', earned: p => p.stars.Medium >= 3 },
  { id: 'master', name: 'Truth Master', emoji: '🧙', description: 'Pass the Hard rank', earned: p => p.stars.Hard >= 1 },
  { id: 'flawless', name: 'Flawless', emoji: '💎', description: 'Get 3 stars on Hard', earned: p => p.stars.Hard >= 3 },
  { id: 'ai-expert', name: 'Robot Spotter', emoji: '🤖', description: 'Spot 5 computer-made fakes', earned: p => (p.topicCorrect.ai ?? 0) >= 5 },
  { id: 'clue-hunter', name: 'Clue Hunter', emoji: '🔎', description: 'Solve 3 "find the clues" puzzles', earned: p => p.kindCorrect.clues >= 3 },
  { id: 'sorter', name: 'Super Sorter', emoji: '🗂️', description: 'Solve 3 sorting puzzles', earned: p => p.kindCorrect.sort >= 3 },
  { id: 'safety', name: 'Safety Shield', emoji: '🛡️', description: 'Get 3 "stay safe" questions right', earned: p => (p.topicCorrect.safety ?? 0) >= 3 },
  { id: 'streak', name: 'On Fire', emoji: '🔥', description: 'Get 5 right in a row', earned: p => p.bestStreak >= 5 },
  { id: 'daily', name: 'Daily Detective', emoji: '📅', description: 'Do the daily challenge 3 days in a row', earned: p => p.daily.streak >= 3 },
  { id: 'hero', name: 'Ultimate Hero', emoji: '🦸', description: 'Earn 1,000 points', earned: p => p.points >= 1000 },
];

/** Adds every badge the player now qualifies for. Returns the new ones. */
export function awardBadges(progress: Progress): { progress: Progress; newBadges: BadgeDef[] } {
  const newBadges = BADGES.filter(b => !progress.badges.includes(b.id) && b.earned(progress));
  if (newBadges.length === 0) return { progress, newBadges };
  return { progress: { ...progress, badges: [...progress.badges, ...newBadges.map(b => b.id)] }, newBadges };
}

// ─── Rounds ───

/** Picks a round of questions for a rank, in a fresh random order with shuffled answers. */
export function buildRound(difficulty: Difficulty, random: () => number = Math.random): Challenge[] {
  const pool = shuffled(CHALLENGES.filter(c => c.difficulty === difficulty), random);
  return pool.slice(0, QUESTIONS_PER_ROUND).map(c => shuffleAnswers(c, random));
}

export function shuffleAnswers(challenge: Challenge, random: () => number = Math.random): Challenge {
  if (challenge.kind === 'choice') return { ...challenge, options: shuffled(challenge.options, random) };
  if (challenge.kind === 'clues') return { ...challenge, clues: shuffled(challenge.clues, random) };
  return { ...challenge, items: shuffled(challenge.items, random) };
}

export function shuffled<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ─── Storage ───

function readNumber(key: string): number {
  try {
    const value = parseInt(localStorage.getItem(key) ?? '', 10);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/** Loads saved progress, moving over points and badges from the first version of the academy. */
export function loadProgress(): Progress {
  const base = emptyProgress();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<Progress>;
      return {
        ...base,
        ...parsed,
        stars: { ...base.stars, ...parsed.stars },
        kindCorrect: { ...base.kindCorrect, ...parsed.kindCorrect },
        daily: { ...base.daily, ...parsed.daily },
        topicCorrect: { ...parsed.topicCorrect },
        lessonsDone: Array.isArray(parsed.lessonsDone) ? parsed.lessonsDone : [],
        badges: Array.isArray(parsed.badges) ? parsed.badges : [],
      };
    }
    const oldBadges = JSON.parse(localStorage.getItem('nli_badges') ?? '[]');
    const known = new Set(BADGES.map(b => b.id));
    return {
      ...base,
      points: readNumber('nli_points'),
      topicCorrect: { ai: readNumber('nli_ai_spots') },
      badges: Array.isArray(oldBadges) ? oldBadges.filter((id: unknown) => typeof id === 'string' && known.has(id)) : [],
    };
  } catch {
    return base;
  }
}

export function saveProgress(progress: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Progress just won't be remembered this time.
  }
}
