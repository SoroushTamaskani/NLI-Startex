import type { AiAssessment, Verdict } from '../types';

export interface VerdictStyle {
  label: string;
  /** Friendly line under the label. */
  kidLabel: string;
  emoji: string;
  /** Tailwind classes for the banner, the pill and the accent text. */
  banner: string;
  pill: string;
  accent: string;
}

export const VERDICT_STYLES: Record<Verdict, VerdictStyle> = {
  TRUE: {
    label: 'True',
    kidLabel: 'This checks out!',
    emoji: '✅',
    banner: 'bg-verdict-true-soft border-verdict-true/40',
    pill: 'bg-verdict-true-soft text-verdict-true-ink border-verdict-true/30',
    accent: 'text-verdict-true-ink',
  },
  FALSE: {
    label: 'False',
    kidLabel: "That's not true",
    emoji: '❌',
    banner: 'bg-verdict-false-soft border-verdict-false/40',
    pill: 'bg-verdict-false-soft text-verdict-false-ink border-verdict-false/30',
    accent: 'text-verdict-false-ink',
  },
  MISLEADING: {
    label: 'Misleading',
    kidLabel: 'Tricky! Part true, but it fools you',
    emoji: '⚠️',
    banner: 'bg-verdict-misleading-soft border-verdict-misleading/40',
    pill: 'bg-verdict-misleading-soft text-verdict-misleading-ink border-verdict-misleading/30',
    accent: 'text-verdict-misleading-ink',
  },
  MIXED: {
    label: 'Mixed',
    kidLabel: 'Some true, some not',
    emoji: '🌗',
    banner: 'bg-verdict-mixed-soft border-verdict-mixed/40',
    pill: 'bg-verdict-mixed-soft text-verdict-mixed-ink border-verdict-mixed/30',
    accent: 'text-verdict-mixed-ink',
  },
  UNVERIFIABLE: {
    label: "Can't confirm",
    kidLabel: 'Not enough proof either way',
    emoji: '🤷',
    banner: 'bg-verdict-unknown-soft border-verdict-unknown/40',
    pill: 'bg-verdict-unknown-soft text-verdict-unknown-ink border-verdict-unknown/30',
    accent: 'text-verdict-unknown-ink',
  },
};

export const AI_LABELS: Record<AiAssessment, { label: string; emoji: string }> = {
  LIKELY_AI: { label: 'Probably computer-made', emoji: '🤖' },
  LIKELY_HUMAN: { label: 'Probably made by a person', emoji: '🙋' },
  UNCERTAIN: { label: "Hard to tell", emoji: '🤔' },
};

export function trustLabel(score: number): string {
  if (score >= 80) return 'Very likely true';
  if (score >= 60) return 'Mostly true';
  if (score > 40) return 'Unclear';
  if (score > 20) return 'Mostly false';
  return 'Very likely false';
}
