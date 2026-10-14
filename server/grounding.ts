/**
 * Turns Gemini grounding metadata into sources and inline citations.
 *
 * The rule this file enforces: a source is shown only if Google Search really
 * returned it (groundingChunks) or the URL-context tool really fetched it
 * (urlContextMetadata). URLs the model writes in its own text are never
 * trusted as sources.
 */
import type { SharedLink, Source } from '../shared/types';

// Minimal structural copies of the SDK types, so this module stays pure and testable.
export interface PartLike {
  text?: string;
  thought?: boolean;
}

export interface GroundingMetadataLike {
  groundingChunks?: { web?: { uri?: string; title?: string; domain?: string } }[];
  groundingSupports?: {
    segment?: { partIndex?: number; startIndex?: number; endIndex?: number; text?: string };
    groundingChunkIndices?: number[];
  }[];
  webSearchQueries?: string[];
  searchEntryPoint?: { renderedContent?: string };
}

export interface UrlContextMetadataLike {
  urlMetadata?: { retrievedUrl?: string; urlRetrievalStatus?: string }[];
}

export interface GroundedReport {
  /** Markdown report with citation markers such as `[2](#cite-2)`. */
  report: string;
  sources: Source[];
  /** Share of the report's body text covered by at least one citation, 0–1. */
  coverage: number;
}

const MAX_SUPPORTS_PER_SOURCE = 3;
const REDIRECT_HOSTS = ['vertexaisearch.cloud.google.com'];
const MAX_SUPPORT_LENGTH = 280;

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Hostname, unless the URL is a Google grounding redirect (which says nothing about the page). */
function realHostnameOf(url: string): string {
  const host = hostnameOf(url);
  return REDIRECT_HOSTS.includes(host) ? '' : host;
}

function looksLikeHostname(value: string | undefined): value is string {
  return !!value && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(value.trim());
}

/** Converts a UTF-8 byte offset (what Gemini reports) into a JS string index. */
export function byteOffsetToCharIndex(text: string, byteOffset: number): number {
  const bytes = Buffer.from(text, 'utf8');
  const clamped = Math.max(0, Math.min(byteOffset, bytes.length));
  return bytes.subarray(0, clamped).toString('utf8').length;
}

function cleanSupportText(text: string): string {
  const cleaned = text
    .replace(/\[(\d+)\]\(#cite-\d+\)/g, '')
    .replace(/[*_`#>]/g, '')
    .replace(/^\s*[-•]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > MAX_SUPPORT_LENGTH ? `${cleaned.slice(0, MAX_SUPPORT_LENGTH - 1)}…` : cleaned;
}

interface ResolvedSupport {
  start: number;
  end: number;
  text: string;
  chunkIndices: number[];
}

/**
 * Joins the visible text parts of a response and remembers where each part
 * starts, because grounding segments are measured within a single part.
 */
function joinParts(parts: PartLike[]) {
  const partStart = new Map<number, number>();
  let report = '';
  parts.forEach((part, i) => {
    if (typeof part.text !== 'string' || part.thought) return;
    partStart.set(i, report.length);
    report += part.text;
  });
  return { report, partStart };
}

function resolveSupports(
  parts: PartLike[],
  report: string,
  partStart: Map<number, number>,
  meta: GroundingMetadataLike | undefined,
): ResolvedSupport[] {
  const firstTextPart = partStart.keys().next().value ?? 0;
  const resolved: ResolvedSupport[] = [];

  for (const support of meta?.groundingSupports ?? []) {
    const segment = support.segment;
    const chunkIndices = (support.groundingChunkIndices ?? []).filter(i => Number.isInteger(i) && i >= 0);
    if (!segment || chunkIndices.length === 0) continue;

    const partIndex = segment.partIndex ?? firstTextPart;
    const base = partStart.get(partIndex);
    const partText = parts[partIndex]?.text;
    let start = -1;
    let end = -1;

    if (base !== undefined && partText !== undefined && segment.endIndex !== undefined) {
      const s = base + byteOffsetToCharIndex(partText, segment.startIndex ?? 0);
      const e = base + byteOffsetToCharIndex(partText, segment.endIndex);
      // Trust the offsets only if they point at the text Gemini says they do.
      if (!segment.text || report.slice(s, e).trim() === segment.text.trim()) {
        start = s;
        end = e;
      }
    }

    if (start < 0 && segment.text) {
      const found = report.indexOf(segment.text);
      if (found >= 0) {
        start = found;
        end = found + segment.text.length;
      }
    }

    if (start < 0 || end <= start) continue;
    resolved.push({ start, end, text: report.slice(start, end), chunkIndices });
  }

  return resolved.sort((a, b) => a.start - b.start);
}

/** Visible body text length: everything except headings and whitespace. */
function bodyLength(report: string): number {
  return report
    .split('\n')
    .filter(line => !/^\s*#/.test(line))
    .join('')
    .replace(/\s/g, '').length;
}

function coveredLength(report: string, supports: ResolvedSupport[]): number {
  let covered = 0;
  let cursor = 0;
  for (const s of supports) {
    const from = Math.max(s.start, cursor);
    if (s.end > from) {
      covered += report.slice(from, s.end).replace(/\s/g, '').length;
      cursor = s.end;
    }
  }
  return covered;
}

export function buildGroundedReport(
  parts: PartLike[],
  meta: GroundingMetadataLike | undefined,
): GroundedReport {
  const { report: rawReport, partStart } = joinParts(parts);
  const chunks = meta?.groundingChunks ?? [];
  const supports = resolveSupports(parts, rawReport, partStart, meta);

  // Number sources in the order the report first cites them; uncited chunks go last.
  const chunkOrder: number[] = [];
  for (const s of supports) for (const i of s.chunkIndices) if (!chunkOrder.includes(i)) chunkOrder.push(i);
  chunks.forEach((_, i) => {
    if (!chunkOrder.includes(i)) chunkOrder.push(i);
  });

  const sources: Source[] = [];
  const sourceByUrl = new Map<string, Source>();
  const sourceIdByChunk = new Map<number, number>();

  for (const chunkIndex of chunkOrder) {
    const web = chunks[chunkIndex]?.web;
    if (!web?.uri || !/^https?:\/\//i.test(web.uri)) continue;

    let source = sourceByUrl.get(web.uri);
    if (!source) {
      const domain = looksLikeHostname(web.domain)
        ? web.domain.replace(/^www\./, '')
        : looksLikeHostname(web.title)
          ? web.title.trim().replace(/^www\./, '')
          : realHostnameOf(web.uri);
      source = {
        id: sources.length + 1,
        title: web.title?.trim() || domain || 'Web page',
        domain,
        url: web.uri,
        supports: [],
        origin: 'search',
      };
      sources.push(source);
      sourceByUrl.set(web.uri, source);
    }
    sourceIdByChunk.set(chunkIndex, source.id);
  }

  for (const s of supports) {
    const text = cleanSupportText(s.text);
    for (const chunkIndex of s.chunkIndices) {
      const id = sourceIdByChunk.get(chunkIndex);
      const source = id ? sources[id - 1] : undefined;
      if (source && text && !source.supports.includes(text) && source.supports.length < MAX_SUPPORTS_PER_SOURCE) {
        source.supports.push(text);
      }
    }
  }

  // Insert citation markers from the end backwards so earlier offsets stay valid.
  const markersByEnd = new Map<number, Set<number>>();
  for (const s of supports) {
    const ids = s.chunkIndices.map(i => sourceIdByChunk.get(i)).filter((id): id is number => id !== undefined);
    if (ids.length === 0) continue;
    const end = trimEnd(rawReport, s.start, s.end);
    const set = markersByEnd.get(end) ?? new Set<number>();
    ids.forEach(id => set.add(id));
    markersByEnd.set(end, set);
  }

  let report = rawReport;
  for (const end of [...markersByEnd.keys()].sort((a, b) => b - a)) {
    const ids = [...markersByEnd.get(end)!].sort((a, b) => a - b);
    const marker = ids.map(id => `[${id}](#cite-${id})`).join('');
    report = `${report.slice(0, end)} ${marker}${report.slice(end)}`;
  }

  const total = bodyLength(rawReport);
  const coverage = total === 0 ? 0 : Math.min(1, coveredLength(rawReport, supports) / total);

  return { report, sources, coverage };
}

/** Moves a marker position back past trailing whitespace so it hugs the sentence. */
function trimEnd(text: string, start: number, end: number): number {
  let e = end;
  while (e > start && /\s/.test(text[e - 1])) e--;
  return e;
}

const URL_STATUS: Record<string, SharedLink['status']> = {
  URL_RETRIEVAL_STATUS_SUCCESS: 'read',
  URL_RETRIEVAL_STATUS_ERROR: 'failed',
  URL_RETRIEVAL_STATUS_PAYWALL: 'paywalled',
  URL_RETRIEVAL_STATUS_UNSAFE: 'unsafe',
};

export function sharedLinksFrom(meta: UrlContextMetadataLike | undefined): SharedLink[] {
  const seen = new Set<string>();
  const links: SharedLink[] = [];
  for (const item of meta?.urlMetadata ?? []) {
    const url = item.retrievedUrl;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    links.push({ url, status: URL_STATUS[item.urlRetrievalStatus ?? ''] ?? 'unknown' });
  }
  return links;
}

/** Pages the user shared that were read successfully but not cited count as sources too. */
export function addSharedLinkSources(sources: Source[], links: SharedLink[]): Source[] {
  const result = [...sources];
  const known = new Set(result.map(s => s.url));
  for (const link of links) {
    if (link.status !== 'read' || known.has(link.url)) continue;
    const domain = hostnameOf(link.url);
    result.push({
      id: result.length + 1,
      title: domain || link.url,
      domain,
      url: link.url,
      supports: [],
      origin: 'shared-link',
    });
    known.add(link.url);
  }
  return result;
}

/**
 * Grounding links point at a Google redirect. Following it once lets us show
 * people the real page address before they click.
 */
export async function resolveSourceUrls(
  sources: Source[],
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 3000,
): Promise<Source[]> {
  return Promise.all(
    sources.map(async source => {
      if (!REDIRECT_HOSTS.includes(hostnameOf(source.url))) return source;
      try {
        const response = await fetchImpl(source.url, {
          method: 'GET',
          redirect: 'manual',
          signal: AbortSignal.timeout(timeoutMs),
        });
        const location = response.headers.get('location');
        if (location && /^https?:\/\//i.test(location)) {
          return { ...source, url: location, domain: hostnameOf(location) || source.domain };
        }
      } catch {
        // Keep the redirect link; it still works when clicked.
      }
      return source;
    }),
  );
}
