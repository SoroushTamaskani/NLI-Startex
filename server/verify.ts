import {
  createPartFromUri,
  ThinkingLevel,
  type Content,
  type GenerateContentResponse,
  type GoogleGenAI,
  type Part,
} from '@google/genai';
import type { Audience, CheckMode, HistoryTurn, VerificationResult, VerifyAttachment, VerifyRequest, VerifyStage } from '../shared/types';
import { config } from './config';
import { AppError } from './errors';
import { addSharedLinkSources, buildGroundedReport, resolveSourceUrls, sharedLinksFrom } from './grounding';
import { extractionInstruction, researchInstruction } from './prompts';
import { applyEvidenceGuards, EXTRACTION_SCHEMA, normalizeExtracted, type Extracted } from './result';

const MAX_TEXT = 20_000;
const MAX_ATTACHMENTS = 10;
const MAX_HISTORY_TURNS = 8;
const MAX_HISTORY_CHARS = 4_000;
const GEMINI_FILE_PREFIX = 'https://generativelanguage.googleapis.com/';

/** Models the API said don't exist for this key. Skipped for the rest of the process. */
const unavailableModels = new Set<string>();

function isModelNotFound(error: unknown): boolean {
  const err = error as { status?: number; message?: string };
  return err?.status === 404 || /model.*(not found|is not supported)|NOT_FOUND/i.test(err?.message ?? '');
}

/** Tries each model in order, moving on only when a model doesn't exist. */
async function withModelFallback<T>(models: string[], run: (model: string) => Promise<T>): Promise<{ value: T; model: string }> {
  const candidates = [...new Set(models)];
  const usable = candidates.filter(m => !unavailableModels.has(m));
  let lastError: unknown;
  for (const model of usable.length ? usable : candidates) {
    try {
      return { value: await run(model), model };
    } catch (error) {
      if (!isModelNotFound(error)) throw error;
      console.warn(`[nli] model ${model} is not available; trying the next one.`);
      unavailableModels.add(model);
      lastError = error;
    }
  }
  throw lastError;
}

/** Validates and trims an untrusted request body. */
export function parseVerifyRequest(body: unknown): VerifyRequest {
  const data = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const text = typeof data.text === 'string' ? data.text.slice(0, MAX_TEXT) : '';
  const mode: CheckMode = data.mode === 'quick' ? 'quick' : 'deep';
  const audience: Audience = data.audience === 'young' || data.audience === 'teen' ? data.audience : 'kid';

  const attachments: VerifyAttachment[] = [];
  for (const item of Array.isArray(data.attachments) ? data.attachments.slice(0, MAX_ATTACHMENTS) : []) {
    const a = (item ?? {}) as { name?: unknown; ref?: Record<string, unknown> };
    const name = typeof a.name === 'string' ? a.name.slice(0, 200) : 'attachment';
    const ref = a.ref ?? {};
    if (ref.kind === 'file' && typeof ref.fileUri === 'string' && typeof ref.mimeType === 'string') {
      if (!ref.fileUri.startsWith(GEMINI_FILE_PREFIX)) throw new AppError('BAD_REQUEST', 'Invalid attachment.');
      attachments.push({ name, ref: { kind: 'file', fileUri: ref.fileUri, mimeType: ref.mimeType } });
    } else if (ref.kind === 'text' && typeof ref.text === 'string') {
      const truncated = ref.truncated === true || ref.text.length > config.maxDocumentChars;
      attachments.push({ name, ref: { kind: 'text', text: ref.text.slice(0, config.maxDocumentChars), truncated } });
    }
  }

  const history: HistoryTurn[] = (Array.isArray(data.history) ? data.history : [])
    .map(turn => (turn ?? {}) as Record<string, unknown>)
    .filter(turn => (turn.role === 'user' || turn.role === 'model') && typeof turn.text === 'string' && turn.text.trim())
    .slice(-MAX_HISTORY_TURNS)
    .map(turn => ({ role: turn.role as HistoryTurn['role'], text: (turn.text as string).slice(0, MAX_HISTORY_CHARS) }));

  if (!text.trim() && attachments.length === 0) {
    throw new AppError('BAD_REQUEST', 'Send a message or attach something to check.');
  }
  return { text, attachments, history, mode, audience };
}

function buildContents(request: VerifyRequest): Content[] {
  const contents: Content[] = [];
  for (const turn of request.history) {
    // Gemini expects turns to alternate; merge consecutive turns from the same side.
    const last = contents[contents.length - 1];
    if (last?.role === turn.role) last.parts!.push({ text: turn.text });
    else contents.push({ role: turn.role, parts: [{ text: turn.text }] });
  }
  if (contents[0]?.role === 'model') contents.shift();
  if (contents[contents.length - 1]?.role === 'user') contents.pop();

  const parts: Part[] = [];
  request.attachments.forEach((attachment, i) => {
    const label = `Attachment ${i + 1}: "${attachment.name}"`;
    if (attachment.ref.kind === 'file') {
      parts.push({ text: label });
      parts.push(createPartFromUri(attachment.ref.fileUri, attachment.ref.mimeType));
    } else {
      const note = attachment.ref.truncated ? ' (document text, cut short because it is long)' : ' (document text)';
      parts.push({ text: `${label}${note}:\n\n${attachment.ref.text}` });
    }
  });
  const message = request.text.trim() || 'Please check the attached content: is it true, and was it made or edited by AI?';
  parts.push({ text: `User's message:\n${message}` });
  contents.push({ role: 'user', parts });
  return contents;
}

function assertNotBlocked(response: GenerateContentResponse) {
  const blockReason = response.promptFeedback?.blockReason;
  const finishReason = response.candidates?.[0]?.finishReason;
  if (blockReason || finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT' || finishReason === 'BLOCKLIST') {
    throw new AppError(
      'BLOCKED',
      "I can't check this one because it may contain unsafe content. If you're worried about something you saw, talk to a grown-up you trust.",
    );
  }
}

async function research(ai: GoogleGenAI, model: string, request: VerifyRequest, signal: AbortSignal) {
  const base = {
    model,
    contents: buildContents(request),
    config: {
      systemInstruction: researchInstruction(new Date().toISOString().slice(0, 10), request.audience),
      thinkingConfig: { thinkingLevel: request.mode === 'deep' ? ThinkingLevel.HIGH : ThinkingLevel.LOW },
      abortSignal: signal,
    },
  };
  try {
    return await ai.models.generateContent({ ...base, config: { ...base.config, tools: [{ googleSearch: {} }, { urlContext: {} }] } });
  } catch (error) {
    // Some models reject the URL tool alongside search; search alone still grounds the answer.
    const err = error as { status?: number; message?: string };
    if (err?.status === 400 && /url[_ ]?context|tool/i.test(err.message ?? '')) {
      return ai.models.generateContent({ ...base, config: { ...base.config, tools: [{ googleSearch: {} }] } });
    }
    throw error;
  }
}

async function extract(ai: GoogleGenAI, report: string, audience: Audience, signal: AbortSignal): Promise<Extracted> {
  const models = [...new Set([config.models.quick, config.models.deep])].filter(m => !unavailableModels.has(m));
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: `REPORT:\n\n${report}` }] }],
        config: {
          systemInstruction: extractionInstruction(audience),
          responseMimeType: 'application/json',
          responseSchema: EXTRACTION_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          abortSignal: signal,
        },
      });
      return normalizeExtracted(JSON.parse(response.text ?? '{}'), report);
    } catch (error) {
      if (signal.aborted) throw error;
      if (isModelNotFound(error)) unavailableModels.add(model);
      console.warn(`[nli] extraction with ${model} failed:`, (error as Error)?.message);
    }
  }
  // Last resort: read what we can straight from the markdown report.
  return normalizeExtracted({}, report);
}

export async function verify(
  ai: GoogleGenAI,
  request: VerifyRequest,
  options: { signal: AbortSignal; onStage: (stage: VerifyStage) => void },
): Promise<VerificationResult> {
  const started = Date.now();
  const preferred = request.mode === 'quick' ? [config.models.quick, config.models.deep] : [config.models.deep, config.models.quick];

  options.onStage('researching');
  const { value: response, model } = await withModelFallback(preferred, m => research(ai, m, request, options.signal));
  assertNotBlocked(response);

  const candidate = response.candidates?.[0];
  const grounded = buildGroundedReport(candidate?.content?.parts ?? [], candidate?.groundingMetadata);
  const rawReport = (candidate?.content?.parts ?? [])
    .filter(p => typeof p.text === 'string' && !p.thought)
    .map(p => p.text)
    .join('');
  if (!rawReport.trim()) throw new AppError('UPSTREAM', 'NLI did not get an answer back. Please try again.', 502);

  options.onStage('structuring');
  const sharedLinks = sharedLinksFrom(candidate?.urlContextMetadata);
  const [extracted, resolvedSources] = await Promise.all([
    extract(ai, rawReport, request.audience, options.signal),
    resolveSourceUrls(grounded.sources),
  ]);
  const sources = addSharedLinkSources(resolvedSources, sharedLinks);
  const guarded = applyEvidenceGuards(extracted, sources, grounded.coverage);
  const failedLinks = sharedLinks.filter(l => l.status !== 'read');
  if (failedLinks.length > 0) {
    const which = failedLinks.length === 1 ? 'the link you shared' : `${failedLinks.length} of the links you shared`;
    guarded.notices.push(`I couldn't open ${which}, so I didn't read ${failedLinks.length === 1 ? 'it' : 'them'} myself.`);
  }

  const { hasFactualClaims: _unused, ...fields } = guarded.extracted;
  return {
    ...fields,
    report: grounded.report,
    sources,
    sharedLinks,
    searchQueries: candidate?.groundingMetadata?.webSearchQueries ?? [],
    searchSuggestionsHtml: candidate?.groundingMetadata?.searchEntryPoint?.renderedContent,
    citationCoverage: grounded.coverage,
    notices: guarded.notices,
    model,
    durationMs: Date.now() - started,
  };
}
