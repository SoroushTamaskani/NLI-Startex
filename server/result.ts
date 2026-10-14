/**
 * Pure helpers that clean up the model's structured output and apply
 * evidence rules the model is not trusted to enforce on its own.
 */
import { Type } from '@google/genai';
import type { AiAssessment, AiCheck, ClaimCheck, Source, Verdict } from '../shared/types';

export interface Extracted {
  verdict: Verdict;
  headline: string;
  simpleSummary: string;
  credibilityScore: number;
  hasFactualClaims: boolean;
  claims: ClaimCheck[];
  aiCheck: AiCheck;
  tips: string[];
}

const VERDICTS: Verdict[] = ['TRUE', 'FALSE', 'MISLEADING', 'MIXED', 'UNVERIFIABLE'];
const ASSESSMENTS: AiAssessment[] = ['LIKELY_AI', 'LIKELY_HUMAN', 'UNCERTAIN'];

export const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    verdict: { type: Type.STRING, enum: VERDICTS },
    headline: { type: Type.STRING },
    simpleSummary: { type: Type.STRING },
    credibilityScore: { type: Type.NUMBER },
    hasFactualClaims: { type: Type.BOOLEAN },
    claims: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          claim: { type: Type.STRING },
          verdict: { type: Type.STRING, enum: VERDICTS },
          explanation: { type: Type.STRING },
        },
        required: ['claim', 'verdict', 'explanation'],
      },
    },
    aiCheck: {
      type: Type.OBJECT,
      properties: {
        applicable: { type: Type.BOOLEAN },
        assessment: { type: Type.STRING, enum: ASSESSMENTS },
        confidence: { type: Type.NUMBER },
        signals: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['applicable', 'assessment', 'confidence', 'signals'],
    },
    tips: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['verdict', 'headline', 'simpleSummary', 'credibilityScore', 'hasFactualClaims', 'claims', 'aiCheck', 'tips'],
};

/** Score ranges each verdict may use, so the meter can never contradict the verdict. */
const SCORE_RANGE: Record<Verdict, [number, number]> = {
  TRUE: [70, 100],
  FALSE: [0, 30],
  MISLEADING: [10, 50],
  MIXED: [25, 65],
  UNVERIFIABLE: [35, 65],
};

const DEFAULT_SCORE: Record<Verdict, number> = {
  TRUE: 85,
  FALSE: 10,
  MISLEADING: 30,
  MIXED: 45,
  UNVERIFIABLE: 50,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function asVerdict(value: unknown): Verdict | undefined {
  const upper = String(value ?? '').trim().toUpperCase();
  return VERDICTS.find(v => v === upper);
}

function asString(value: unknown, maxLength = 600): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function asStrings(value: unknown, maxItems: number, maxLength = 200): string[] {
  return Array.isArray(value) ? value.map(v => asString(v, maxLength)).filter(Boolean).slice(0, maxItems) : [];
}

function scoreFor(verdict: Verdict, raw: unknown): number {
  const [min, max] = SCORE_RANGE[verdict];
  const n = Number(raw);
  return Math.round(Number.isFinite(n) ? clamp(n, min, max) : DEFAULT_SCORE[verdict]);
}

/** Reads the verdict line from the markdown report; used when structured extraction fails. */
export function verdictFromReport(report: string): Verdict {
  const section = report.match(/##\s*Verdict\s*\n+([^\n]+)/i)?.[1] ?? report.slice(0, 200);
  for (const verdict of ['UNVERIFIABLE', 'MISLEADING', 'MIXED', 'FALSE', 'TRUE'] as Verdict[]) {
    if (new RegExp(`\\b${verdict}\\b`, 'i').test(section)) return verdict;
  }
  return 'UNVERIFIABLE';
}

function sectionText(report: string, heading: string): string {
  const match = report.match(new RegExp(`##\\s*${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i'));
  return match?.[1].trim() ?? '';
}

export function normalizeExtracted(raw: unknown, report: string): Extracted {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const verdict = asVerdict(data.verdict) ?? verdictFromReport(report);
  const ai = (data.aiCheck && typeof data.aiCheck === 'object' ? data.aiCheck : {}) as Record<string, unknown>;
  const aiConfidence = Number(ai.confidence);
  const bottomLine = sectionText(report, 'Bottom line');

  const claims = Array.isArray(data.claims)
    ? data.claims
        .map(c => {
          const claim = (c ?? {}) as Record<string, unknown>;
          return {
            claim: asString(claim.claim, 300),
            verdict: asVerdict(claim.verdict) ?? 'UNVERIFIABLE',
            explanation: asString(claim.explanation, 400),
          };
        })
        .filter(c => c.claim)
        .slice(0, 6)
    : [];

  return {
    verdict,
    headline: asString(data.headline, 160) || defaultHeadline(verdict),
    simpleSummary: asString(data.simpleSummary, 500) || bottomLine.replace(/[*_#]/g, '').slice(0, 500),
    credibilityScore: scoreFor(verdict, data.credibilityScore),
    hasFactualClaims: data.hasFactualClaims !== false,
    claims,
    aiCheck: {
      applicable: ai.applicable === true,
      assessment: ASSESSMENTS.find(a => a === ai.assessment) ?? 'UNCERTAIN',
      confidence: Math.round(Number.isFinite(aiConfidence) ? clamp(aiConfidence, 0, 100) : 50),
      signals: asStrings(ai.signals, 6, 160),
    },
    tips: asStrings(data.tips, 3, 240),
  };
}

function defaultHeadline(verdict: Verdict): string {
  switch (verdict) {
    case 'TRUE':
      return 'This checks out';
    case 'FALSE':
      return 'This is not true';
    case 'MISLEADING':
      return 'This is misleading';
    case 'MIXED':
      return 'Some of this is true, some is not';
    default:
      return "We can't confirm this";
  }
}

export interface GuardedResult {
  extracted: Extracted;
  notices: string[];
}

/**
 * The verdict is only allowed to be definite when real sources back it.
 * Without any web evidence, factual verdicts become UNVERIFIABLE.
 */
export function applyEvidenceGuards(extracted: Extracted, sources: Source[], coverage: number): GuardedResult {
  const notices: string[] = [];
  let result = extracted;
  const searchSources = sources.filter(s => s.origin === 'search').length;

  if (extracted.hasFactualClaims && sources.length === 0 && extracted.verdict !== 'UNVERIFIABLE') {
    result = {
      ...extracted,
      verdict: 'UNVERIFIABLE',
      headline: "We couldn't find sources to confirm this",
      credibilityScore: 50,
    };
    notices.push(
      `No web sources came back for this check, so NLI changed the verdict from "${label(extracted.verdict)}" to "Can't confirm". The report below is the AI's reasoning without evidence; treat it with care.`,
    );
  } else if (searchSources > 0 && coverage < 0.15) {
    notices.push('Only a small part of this report is directly linked to a source. Check the sources below before relying on it.');
  }

  if (result.aiCheck.applicable && result.aiCheck.confidence > 85) {
    result = { ...result, aiCheck: { ...result.aiCheck, confidence: 85 } };
  }

  return { extracted: result, notices };
}

function label(verdict: Verdict): string {
  return verdict.charAt(0) + verdict.slice(1).toLowerCase();
}
