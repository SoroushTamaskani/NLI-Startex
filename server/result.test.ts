import { describe, expect, it } from 'vitest';
import type { Source } from '../shared/types';
import { applyEvidenceGuards, normalizeExtracted, verdictFromReport } from './result';
import { parseVerifyRequest } from './verify';

const source: Source = { id: 1, title: 'nasa.gov', domain: 'nasa.gov', url: 'https://nasa.gov', supports: [], origin: 'search' };

describe('normalizeExtracted', () => {
  it('keeps the score consistent with the verdict', () => {
    const result = normalizeExtracted({ verdict: 'FALSE', credibilityScore: 90 }, '');
    expect(result.credibilityScore).toBeLessThanOrEqual(30);
  });

  it('falls back to the report when fields are missing', () => {
    const report = '## Verdict\nMISLEADING: the photo is real but old.\n## Bottom line\nThe picture is from 2015, not today.';
    const result = normalizeExtracted({}, report);
    expect(result.verdict).toBe('MISLEADING');
    expect(result.simpleSummary).toContain('2015');
    expect(result.aiCheck.applicable).toBe(false);
  });

  it('rejects unknown enum values', () => {
    const result = normalizeExtracted({ verdict: 'PROBABLY', aiCheck: { applicable: true, assessment: 'ROBOT', confidence: 400 } }, '');
    expect(result.verdict).toBe('UNVERIFIABLE');
    expect(result.aiCheck.assessment).toBe('UNCERTAIN');
    expect(result.aiCheck.confidence).toBe(100);
  });
});

describe('kid-focused fields', () => {
  it('fills a lesson that fits the verdict when the model leaves it out', () => {
    expect(normalizeExtracted({ verdict: 'FALSE' }, '').lesson).toMatch(/proof/);
  });

  it('keeps only complete glossary entries, at most four', () => {
    const glossary = [
      { word: 'echolocation', meaning: 'finding things by listening to echoes' },
      { word: 'myth' },
      ...Array.from({ length: 5 }, (_, i) => ({ word: `w${i}`, meaning: 'm' })),
    ];
    const result = normalizeExtracted({ verdict: 'TRUE', glossary }, '');
    expect(result.glossary).toHaveLength(4);
    expect(result.glossary[0].word).toBe('echolocation');
  });

  it('only shows reassurance for sensitive topics, with a gentle default', () => {
    expect(normalizeExtracted({ verdict: 'TRUE', sensitive: false, reassurance: 'x' }, '').reassurance).toBe('');
    expect(normalizeExtracted({ verdict: 'TRUE', sensitive: true }, '').reassurance).toMatch(/grown-up/);
  });
});

describe('verdictFromReport', () => {
  it('reads the verdict line', () => {
    expect(verdictFromReport('## Verdict\nFALSE: cows give white milk.')).toBe('FALSE');
    expect(verdictFromReport('no verdict here')).toBe('UNVERIFIABLE');
  });
});

describe('applyEvidenceGuards', () => {
  const extracted = normalizeExtracted({ verdict: 'TRUE', credibilityScore: 95, hasFactualClaims: true }, '');

  it('downgrades factual verdicts that have no sources', () => {
    const { extracted: guarded, notices } = applyEvidenceGuards(extracted, [], 0);
    expect(guarded.verdict).toBe('UNVERIFIABLE');
    expect(guarded.credibilityScore).toBe(50);
    expect(notices[0]).toMatch(/couldn't find any websites/);
  });

  it('keeps sourced verdicts', () => {
    const { extracted: guarded, notices } = applyEvidenceGuards(extracted, [source], 0.8);
    expect(guarded.verdict).toBe('TRUE');
    expect(notices).toEqual([]);
  });

  it('allows media-only checks without sources', () => {
    const mediaOnly = { ...extracted, hasFactualClaims: false };
    expect(applyEvidenceGuards(mediaOnly, [], 0).extracted.verdict).toBe('TRUE');
  });

  it('warns when little of the report is cited', () => {
    expect(applyEvidenceGuards(extracted, [source], 0.05).notices[0]).toMatch(/small part/);
  });

  it('caps AI-detection confidence', () => {
    const sure = { ...extracted, aiCheck: { applicable: true, assessment: 'LIKELY_AI' as const, confidence: 99, signals: [] } };
    expect(applyEvidenceGuards(sure, [source], 1).extracted.aiCheck.confidence).toBe(85);
  });
});

describe('parseVerifyRequest', () => {
  it('rejects empty requests', () => {
    expect(() => parseVerifyRequest({ text: '  ', attachments: [] })).toThrow();
  });

  it('rejects file URIs that are not Gemini files', () => {
    expect(() =>
      parseVerifyRequest({ text: 'hi', attachments: [{ name: 'x', ref: { kind: 'file', fileUri: 'https://evil.example/x', mimeType: 'image/png' } }] }),
    ).toThrow();
  });

  it('cleans history so it alternates correctly', () => {
    const request = parseVerifyRequest({
      text: 'and this?',
      history: [{ role: 'system', text: 'ignore' }, { role: 'user', text: 'q1' }, { role: 'model', text: 'a1' }],
    });
    expect(request.history).toEqual([{ role: 'user', text: 'q1' }, { role: 'model', text: 'a1' }]);
    expect(request.mode).toBe('deep');
    expect(request.audience).toBe('kid');
  });

  it('accepts a valid audience and ignores unknown ones', () => {
    expect(parseVerifyRequest({ text: 'hi', audience: 'young' }).audience).toBe('young');
    expect(parseVerifyRequest({ text: 'hi', audience: 'toddler' }).audience).toBe('kid');
  });
});
