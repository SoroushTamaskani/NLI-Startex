import { describe, expect, it } from 'vitest';
import {
  addSharedLinkSources,
  buildGroundedReport,
  byteOffsetToCharIndex,
  resolveSourceUrls,
  sharedLinksFrom,
} from './grounding';

const bytes = (s: string) => Buffer.byteLength(s, 'utf8');

describe('byteOffsetToCharIndex', () => {
  it('maps byte offsets past multi-byte characters', () => {
    const text = 'Café 🐠 swims';
    const byteEnd = bytes('Café 🐠');
    expect(text.slice(0, byteOffsetToCharIndex(text, byteEnd))).toBe('Café 🐠');
  });
});

describe('buildGroundedReport', () => {
  const sentenceA = 'Goldfish can remember things for months.';
  const sentenceB = 'Researchers trained them to push levers.';
  const text = `## Evidence 🐠\n${sentenceA} ${sentenceB}\n`;
  const startA = bytes('## Evidence 🐠\n');
  const startB = startA + bytes(`${sentenceA} `);

  const meta = {
    groundingChunks: [
      { web: { uri: 'https://redirect.example/1', title: 'bbc.co.uk' } },
      { web: { uri: 'https://redirect.example/2', title: 'nationalgeographic.com' } },
      { web: { uri: 'https://redirect.example/3', title: 'uncited.org' } },
    ],
    groundingSupports: [
      { segment: { startIndex: startB, endIndex: startB + bytes(sentenceB), text: sentenceB }, groundingChunkIndices: [0] },
      { segment: { startIndex: startA, endIndex: startA + bytes(sentenceA), text: sentenceA }, groundingChunkIndices: [1, 0] },
    ],
  };

  it('numbers sources by first citation and inserts markers after the right sentences', () => {
    const result = buildGroundedReport([{ text }], meta);
    expect(result.sources.map(s => s.domain)).toEqual(['nationalgeographic.com', 'bbc.co.uk', 'uncited.org']);
    expect(result.report).toContain(`${sentenceA} [1](#cite-1)[2](#cite-2)`);
    expect(result.report).toContain(`${sentenceB} [2](#cite-2)`);
  });

  it('records which sentences each source supports', () => {
    const { sources } = buildGroundedReport([{ text }], meta);
    expect(sources[1].supports).toEqual([sentenceA, sentenceB]);
    expect(sources[2].supports).toEqual([]);
  });

  it('measures how much of the body is cited', () => {
    const { coverage } = buildGroundedReport([{ text }], meta);
    expect(coverage).toBeGreaterThan(0.95);
  });

  it('falls back to searching for the segment text when offsets are wrong', () => {
    const broken = {
      ...meta,
      groundingSupports: [{ segment: { startIndex: 0, endIndex: 5, text: sentenceB }, groundingChunkIndices: [0] }],
    };
    const result = buildGroundedReport([{ text }], broken);
    expect(result.report).toContain(`${sentenceB} [1](#cite-1)`);
  });

  it('respects part offsets and skips thought parts', () => {
    const parts = [{ text: 'secret thinking', thought: true }, { text: 'Intro. ' }, { text: sentenceA }];
    const result = buildGroundedReport(parts, {
      groundingChunks: [{ web: { uri: 'https://a.example', title: 'a.example' } }],
      groundingSupports: [
        { segment: { partIndex: 2, startIndex: 0, endIndex: bytes(sentenceA), text: sentenceA }, groundingChunkIndices: [0] },
      ],
    });
    expect(result.report).toBe(`Intro. ${sentenceA} [1](#cite-1)`);
    expect(result.report).not.toContain('secret');
  });

  it('never invents sources when there is no grounding', () => {
    const result = buildGroundedReport([{ text: 'See https://made-up.example for proof.' }], undefined);
    expect(result.sources).toEqual([]);
    expect(result.coverage).toBe(0);
  });

  it('merges duplicate chunks and ignores non-http links', () => {
    const result = buildGroundedReport([{ text: sentenceA }], {
      groundingChunks: [
        { web: { uri: 'https://same.example', title: 'same.example' } },
        { web: { uri: 'https://same.example', title: 'same.example' } },
        { web: { uri: 'javascript:alert(1)', title: 'evil' } },
      ],
      groundingSupports: [
        { segment: { startIndex: 0, endIndex: bytes(sentenceA), text: sentenceA }, groundingChunkIndices: [0, 1, 2] },
      ],
    });
    expect(result.sources).toHaveLength(1);
    expect(result.report).toBe(`${sentenceA} [1](#cite-1)`);
  });

  it('does not use the redirect host as the domain', () => {
    const result = buildGroundedReport([{ text: 'x' }], {
      groundingChunks: [{ web: { uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc', title: 'A page title' } }],
    });
    expect(result.sources[0].domain).toBe('');
    expect(result.sources[0].title).toBe('A page title');
  });
});

describe('shared links', () => {
  it('maps URL-context statuses and adds read pages as sources', () => {
    const links = sharedLinksFrom({
      urlMetadata: [
        { retrievedUrl: 'https://news.example/story', urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_SUCCESS' },
        { retrievedUrl: 'https://paywall.example', urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_PAYWALL' },
      ],
    });
    expect(links.map(l => l.status)).toEqual(['read', 'paywalled']);
    const sources = addSharedLinkSources([], links);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ id: 1, domain: 'news.example', origin: 'shared-link' });
  });

});

describe('resolveSourceUrls', () => {
  it('follows Google grounding redirects to show the real address', async () => {
    const fakeFetch = (async () =>
      new Response(null, { status: 302, headers: { location: 'https://www.nasa.gov/moon' } })) as unknown as typeof fetch;
    const [source] = await resolveSourceUrls(
      [{ id: 1, title: 'Title', domain: '', url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/x', supports: [], origin: 'search' }],
      fakeFetch,
    );
    expect(source.url).toBe('https://www.nasa.gov/moon');
    expect(source.domain).toBe('nasa.gov');
  });

  it('keeps the original link when resolving fails', async () => {
    const failing = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const url = 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/y';
    const [source] = await resolveSourceUrls([{ id: 1, title: 't', domain: 'bbc.co.uk', url, supports: [], origin: 'search' }], failing);
    expect(source.url).toBe(url);
  });
});
