/**
 * Types shared by the browser app and the API server.
 * Keep this file free of runtime imports so both sides can use it.
 */

export type Verdict = 'TRUE' | 'FALSE' | 'MISLEADING' | 'MIXED' | 'UNVERIFIABLE';

export type AiAssessment = 'LIKELY_AI' | 'LIKELY_HUMAN' | 'UNCERTAIN';

export type CheckMode = 'deep' | 'quick';

/** Who the answer is written for: 6–8, 9–12, or 13 and up. */
export type Audience = 'young' | 'kid' | 'teen';

/** What the server hands back after a file has been uploaded. */
export type UploadRef =
  | {
      kind: 'file';
      fileUri: string;
      mimeType: string;
      /** ISO timestamp after which Gemini deletes the file (about 48h). */
      expiresAt?: string;
    }
  | {
      kind: 'text';
      text: string;
      truncated: boolean;
    };

export interface UploadResponse {
  ref: UploadRef;
}

export interface VerifyAttachment {
  name: string;
  ref: UploadRef;
}

export interface HistoryTurn {
  role: 'user' | 'model';
  text: string;
}

export interface VerifyRequest {
  text: string;
  attachments: VerifyAttachment[];
  history: HistoryTurn[];
  mode: CheckMode;
  audience: Audience;
}

/**
 * A web page the answer actually relied on. Every source here comes from
 * Gemini's grounding metadata (pages Google Search really returned) or from
 * the URL-context tool (pages really fetched) — never from text the model wrote.
 */
export interface Source {
  /** 1-based number used by the inline citation markers in the report. */
  id: number;
  title: string;
  /** Hostname, e.g. "nasa.gov". */
  domain: string;
  /** Link to open. The resolved page URL when we could resolve it. */
  url: string;
  /** Sentences from the report that this source supports. */
  supports: string[];
  origin: 'search' | 'shared-link';
}

export interface SharedLink {
  url: string;
  status: 'read' | 'failed' | 'unsafe' | 'paywalled' | 'unknown';
}

export interface ClaimCheck {
  claim: string;
  verdict: Verdict;
  explanation: string;
}

export interface AiCheck {
  /** False when the input is a plain claim with no media/text to judge. */
  applicable: boolean;
  assessment: AiAssessment;
  /** 0–100: how sure the model is about the assessment. */
  confidence: number;
  signals: string[];
}

export interface GlossaryWord {
  word: string;
  meaning: string;
}

export interface VerificationResult {
  verdict: Verdict;
  headline: string;
  /** Short explanation in plain words a 10-year-old can follow. */
  simpleSummary: string;
  /** 0–100, 0 = certainly false, 100 = certainly true. */
  credibilityScore: number;
  claims: ClaimCheck[];
  aiCheck: AiCheck;
  tips: string[];
  /** One reusable fact-checking habit this check teaches. */
  lesson: string;
  /** Tricky words from the answer, explained simply. */
  glossary: GlossaryWord[];
  /** True when the topic could worry or upset a child. */
  sensitive: boolean;
  /** Calm words for a worried reader; empty unless `sensitive`. */
  reassurance: string;
  /** Full markdown report with citation markers like [1](#cite-1). */
  report: string;
  sources: Source[];
  sharedLinks: SharedLink[];
  searchQueries: string[];
  /** Google Search suggestion widget (HTML) required when showing grounded results. */
  searchSuggestionsHtml?: string;
  /** Share of report sentences backed by at least one source, 0–1. */
  citationCoverage: number;
  /** Notes the server added, e.g. when a verdict was downgraded for lack of evidence. */
  notices: string[];
  model: string;
  durationMs: number;
}

export type VerifyStage = 'researching' | 'structuring';

export type ErrorCode =
  | 'NO_API_KEY'
  | 'RATE_LIMITED'
  | 'QUOTA'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE'
  | 'FILE_EXPIRED'
  | 'BLOCKED'
  | 'BAD_REQUEST'
  | 'CANCELLED'
  | 'NETWORK'
  | 'UPSTREAM';

export interface ApiError {
  code: ErrorCode;
  message: string;
}

/** One line of the newline-delimited JSON stream from POST /api/verify. */
export type VerifyEvent =
  | { type: 'stage'; stage: VerifyStage }
  | { type: 'result'; result: VerificationResult }
  | { type: 'error'; error: ApiError };

export interface HealthResponse {
  ok: boolean;
  hasApiKey: boolean;
  models: { deep: string; quick: string };
  maxUploadMb: number;
}
