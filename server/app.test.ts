import type { GoogleGenAI } from '@google/genai';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VerifyEvent } from '../shared/types';
import { createApiRouter } from './app';

const REPORT = '## Verdict\nFALSE: goldfish remember for months.\n## What the evidence shows\nGoldfish can remember things for months.\n';
const SENTENCE = 'Goldfish can remember things for months.';

function researchResponse(withGrounding: boolean) {
  const start = Buffer.byteLength(REPORT.slice(0, REPORT.indexOf(SENTENCE)), 'utf8');
  return {
    candidates: [
      {
        finishReason: 'STOP',
        content: { role: 'model', parts: [{ text: REPORT }] },
        groundingMetadata: withGrounding
          ? {
              webSearchQueries: ['goldfish memory study'],
              groundingChunks: [{ web: { uri: 'https://www.bbc.co.uk/goldfish', title: 'bbc.co.uk' } }],
              groundingSupports: [
                { segment: { startIndex: start, endIndex: start + Buffer.byteLength(SENTENCE), text: SENTENCE }, groundingChunkIndices: [0] },
              ],
            }
          : undefined,
      },
    ],
  };
}

function fakeAi(options: { grounding?: boolean; extractionFails?: boolean } = {}) {
  const generateContent = vi.fn(async (params: { config?: { responseSchema?: unknown } }) => {
    if (params.config?.responseSchema) {
      if (options.extractionFails) throw new Error('model unavailable');
      return {
        text: JSON.stringify({
          verdict: 'FALSE',
          headline: 'Goldfish remember for months',
          simpleSummary: 'Goldfish have good memories.',
          credibilityScore: 5,
          hasFactualClaims: true,
          claims: [{ claim: 'Goldfish have a 3-second memory', verdict: 'FALSE', explanation: 'Studies show months.' }],
          aiCheck: { applicable: false, assessment: 'UNCERTAIN', confidence: 0, signals: [] },
          tips: ['Look for a science website.'],
        }),
      };
    }
    return researchResponse(options.grounding ?? true);
  });
  return { ai: { models: { generateContent }, files: {} } as unknown as GoogleGenAI, generateContent };
}

let server: ReturnType<express.Express['listen']> | undefined;

async function start(ai: GoogleGenAI | null) {
  const app = express();
  app.use('/api', createApiRouter(ai));
  server = app.listen(0);
  await new Promise(resolve => server!.once('listening', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
}

afterEach(() => {
  server?.close();
  server = undefined;
});

async function readEvents(response: Response): Promise<VerifyEvent[]> {
  const text = await response.text();
  return text
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

describe('POST /api/verify', () => {
  it('streams stages and a result whose sources come from grounding metadata', async () => {
    const { ai, generateContent } = fakeAi();
    const base = await start(ai);
    const response = await fetch(`${base}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Do goldfish have a 3 second memory?', mode: 'quick' }),
    });
    expect(response.headers.get('content-type')).toContain('application/x-ndjson');
    const events = await readEvents(response);

    expect(events.filter(e => e.type === 'stage').map(e => (e as { stage: string }).stage)).toEqual(['researching', 'structuring']);
    const result = events.find(e => e.type === 'result');
    if (result?.type !== 'result') throw new Error('no result');
    expect(result.result.verdict).toBe('FALSE');
    expect(result.result.sources).toHaveLength(1);
    expect(result.result.sources[0]).toMatchObject({ domain: 'bbc.co.uk', url: 'https://www.bbc.co.uk/goldfish' });
    expect(result.result.report).toContain(`${SENTENCE} [1](#cite-1)`);
    expect(result.result.searchQueries).toEqual(['goldfish memory study']);
    expect(result.result.notices).toEqual([]);

    // The research call must use search + URL tools; the extraction call must not.
    const [researchCall, extractCall] = generateContent.mock.calls.map(c => c[0] as { config: { tools?: unknown[] } });
    expect(researchCall.config.tools).toEqual([{ googleSearch: {} }, { urlContext: {} }]);
    expect(extractCall.config.tools).toBeUndefined();
  });

  it('downgrades to "can\'t confirm" when no sources came back', async () => {
    const { ai } = fakeAi({ grounding: false });
    const base = await start(ai);
    const response = await fetch(`${base}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Do goldfish have a 3 second memory?' }),
    });
    const result = (await readEvents(response)).find(e => e.type === 'result');
    if (result?.type !== 'result') throw new Error('no result');
    expect(result.result.verdict).toBe('UNVERIFIABLE');
    expect(result.result.sources).toEqual([]);
    expect(result.result.notices[0]).toMatch(/No web sources/);
  });

  it('still answers when structured extraction fails', async () => {
    const { ai } = fakeAi({ extractionFails: true });
    const base = await start(ai);
    const response = await fetch(`${base}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'goldfish?' }),
    });
    const result = (await readEvents(response)).find(e => e.type === 'result');
    if (result?.type !== 'result') throw new Error('no result');
    expect(result.result.verdict).toBe('FALSE');
  });

  it('rejects empty requests with a JSON error', async () => {
    const base = await start(fakeAi().ai);
    const response = await fetch(`${base}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('explains when the server has no API key', async () => {
    const base = await start(null);
    const health = await (await fetch(`${base}/health`)).json();
    expect(health.hasApiKey).toBe(false);
    const response = await fetch(`${base}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"text":"hi"}' });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'NO_API_KEY' });
  });
});

describe('model fallback', () => {
  it('uses the other model when the preferred one does not exist', async () => {
    const { ai, generateContent } = fakeAi();
    const original = generateContent.getMockImplementation()!;
    generateContent.mockImplementation(async (params: { model?: string; config?: { responseSchema?: unknown } }) => {
      if (params.model === 'gemini-3.6-flash') throw Object.assign(new Error('models/gemini-3.6-flash is not found'), { status: 404 });
      return original(params);
    });
    const base = await start(ai);
    const response = await fetch(`${base}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'goldfish?', mode: 'quick' }),
    });
    const result = (await readEvents(response)).find(e => e.type === 'result');
    if (result?.type !== 'result') throw new Error('no result');
    expect(result.result.model).toBe('gemini-3.1-pro-preview');
    expect(result.result.verdict).toBe('FALSE');
  });
});

describe('POST /api/upload', () => {
  it('turns text files into text attachments without calling Gemini', async () => {
    const base = await start(fakeAi().ai);
    const response = await fetch(`${base}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'X-File-Name': encodeURIComponent('notes – draft.txt') },
      body: 'The moon is made of cheese.',
    });
    expect(await response.json()).toEqual({ ref: { kind: 'text', text: 'The moon is made of cheese.', truncated: false } });
  });

  it('rejects unsupported files with a helpful message', async () => {
    const base = await start(fakeAi().ai);
    const response = await fetch(`${base}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/msword', 'X-File-Name': 'old.doc' },
      body: 'binary',
    });
    expect(response.status).toBe(415);
    expect((await response.json()).message).toMatch(/\.docx/);
  });
});
