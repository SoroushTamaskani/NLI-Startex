import { describe, expect, it } from 'vitest';
import { CHALLENGES, challengesFor } from './challenges';
import { LESSONS } from './lessons';
import {
  applyAnswer,
  awardBadges,
  buildRound,
  completeDaily,
  completeLesson,
  dailyChallengeFor,
  emptyProgress,
  finishRound,
  isUnlocked,
  pointsFor,
  QUESTIONS_PER_ROUND,
  rankFor,
  starsFor,
} from './progress';

describe('content', () => {
  it('has a full round of unique questions for every rank', () => {
    for (const level of ['Easy', 'Medium', 'Hard'] as const) expect(challengesFor(level).length).toBeGreaterThanOrEqual(QUESTIONS_PER_ROUND);
    const ids = [...CHALLENGES, ...LESSONS.flatMap(l => l.quiz)].map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has exactly one right answer per multiple-choice question, and at least one clue per clue puzzle', () => {
    for (const c of [...CHALLENGES, ...LESSONS.flatMap(l => l.quiz)]) {
      if (c.kind === 'choice') expect(c.options.filter(o => o.isCorrect)).toHaveLength(1);
      if (c.kind === 'clues') expect(c.clues.some(clue => clue.suspicious)).toBe(true);
      if (c.kind === 'sort') expect(new Set(c.items.map(i => i.group)).size).toBe(2);
    }
  });
});

describe('scoring', () => {
  it('rewards harder ranks and streaks, and halves points after a hint', () => {
    expect(pointsFor('Easy', 1, false)).toBe(50);
    expect(pointsFor('Hard', 1, false)).toBe(150);
    expect(pointsFor('Easy', 3, false)).toBe(70);
    expect(pointsFor('Easy', 20, false)).toBe(100);
    expect(pointsFor('Medium', 1, true)).toBe(50);
  });

  it('gives stars by share of right answers', () => {
    expect(starsFor(6, 6)).toBe(3);
    expect(starsFor(4, 6)).toBe(2);
    expect(starsFor(3, 6)).toBe(1);
    expect(starsFor(2, 6)).toBe(0);
  });

  it('unlocks the next rank after one star, and keeps the best stars', () => {
    let p = emptyProgress();
    expect(isUnlocked(p, 'Easy')).toBe(true);
    expect(isUnlocked(p, 'Medium')).toBe(false);
    p = finishRound(p, 'Easy', 3, 6);
    expect(isUnlocked(p, 'Medium')).toBe(true);
    p = finishRound(p, 'Easy', 1, 6);
    expect(p.stars.Easy).toBe(1);
  });

  it('tracks topics, puzzle types and the best streak', () => {
    const clues = CHALLENGES.find(c => c.kind === 'clues')!;
    let { progress } = applyAnswer(emptyProgress(), { challenge: clues, correct: true, streak: 4, usedHint: false, difficulty: 'Easy' });
    ({ progress } = applyAnswer(progress, { challenge: clues, correct: false, streak: 0, usedHint: false, difficulty: 'Easy' }));
    expect(progress.answered).toBe(2);
    expect(progress.correct).toBe(1);
    expect(progress.bestStreak).toBe(4);
    expect(progress.kindCorrect.clues).toBe(1);
    expect(progress.topicCorrect[clues.topic]).toBe(1);
  });
});

describe('ranks', () => {
  it('names the rank and the progress to the next one', () => {
    expect(rankFor(0).rank.title).toBe('Rookie Detective');
    const mid = rankFor(550);
    expect(mid.rank.title).toBe('Junior Detective');
    expect(mid.progress).toBeCloseTo(0.5);
    expect(rankFor(99999).next).toBeUndefined();
  });
});

describe('lessons and daily challenge', () => {
  it('pays for a lesson only once', () => {
    const first = completeLesson(emptyProgress(), 'moves');
    expect(first.earned).toBe(30);
    expect(completeLesson(first.progress, 'moves').earned).toBe(0);
  });

  it('picks the same daily question all day, and counts day streaks', () => {
    const monday = new Date(2026, 9, 12, 8);
    expect(dailyChallengeFor(monday).id).toBe(dailyChallengeFor(new Date(2026, 9, 12, 20)).id);
    let { progress } = completeDaily(emptyProgress(), monday, true);
    expect(progress.daily.streak).toBe(1);
    expect(completeDaily(progress, monday, true).earned).toBe(0);
    ({ progress } = completeDaily(progress, new Date(2026, 9, 13), true));
    expect(progress.daily.streak).toBe(2);
    ({ progress } = completeDaily(progress, new Date(2026, 9, 15), false));
    expect(progress.daily.streak).toBe(1);
  });
});

describe('badges and rounds', () => {
  it('awards each badge once', () => {
    const p = { ...emptyProgress(), correct: 1, points: 1200 };
    const first = awardBadges(p);
    expect(first.newBadges.map(b => b.id)).toEqual(['rookie', 'hero']);
    expect(awardBadges(first.progress).newBadges).toEqual([]);
  });

  it('builds a round from one rank without repeats', () => {
    const round = buildRound('Medium');
    expect(round).toHaveLength(QUESTIONS_PER_ROUND);
    expect(new Set(round.map(c => c.id)).size).toBe(QUESTIONS_PER_ROUND);
    expect(round.every(c => c.difficulty === 'Medium')).toBe(true);
  });
});
