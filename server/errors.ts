import type { ApiError, ErrorCode } from '../shared/types';

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public httpStatus = 400,
  ) {
    super(message);
  }

  toJSON(): ApiError {
    return { code: this.code, message: this.message };
  }
}

/** Maps anything thrown by the Gemini SDK (or our own code) to a friendly API error. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof AppError) return error.toJSON();

  const err = error as { name?: string; status?: number; message?: string };
  const message = String(err?.message ?? '');

  if (err?.name === 'AbortError') {
    return { code: 'CANCELLED', message: 'The check was stopped.' };
  }
  if (err?.status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(message)) {
    return { code: 'QUOTA', message: 'NLI is getting lots of questions right now. Please try again in a minute.' };
  }
  if ((err?.status === 403 || err?.status === 404) && /file/i.test(message)) {
    return { code: 'FILE_EXPIRED', message: 'An attached file is no longer available. Please attach it again.' };
  }
  if (err?.status === 400 && /api key/i.test(message)) {
    return { code: 'NO_API_KEY', message: 'The Gemini API key on the server is not valid.' };
  }
  if (err?.status === 413 || /too large|payload size/i.test(message)) {
    return { code: 'FILE_TOO_LARGE', message: 'That request is too large. Try a shorter clip or a smaller file.' };
  }

  console.error('[nli] upstream error:', error);
  return { code: 'UPSTREAM', message: 'Something went wrong while checking. Please try again.' };
}

export function httpStatusFor(error: ApiError): number {
  switch (error.code) {
    case 'NO_API_KEY':
      return 503;
    case 'RATE_LIMITED':
    case 'QUOTA':
      return 429;
    case 'FILE_TOO_LARGE':
      return 413;
    case 'UNSUPPORTED_FILE':
      return 415;
    case 'BAD_REQUEST':
    case 'FILE_EXPIRED':
      return 400;
    default:
      return 502;
  }
}
