import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });

function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const apiKey = process.env.GEMINI_API_KEY?.trim() ?? '';

export const config = {
  port: numberFromEnv('PORT', 3000),
  isProduction: process.env.NODE_ENV === 'production',
  /** Placeholder values from .env.example don't count as a key. */
  apiKey: apiKey && apiKey !== 'MY_GEMINI_API_KEY' ? apiKey : '',
  models: {
    deep: process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-pro-preview',
    quick: process.env.GEMINI_FAST_MODEL?.trim() || 'gemini-3.6-flash',
  },
  maxUploadMb: numberFromEnv('MAX_UPLOAD_MB', 100),
  /** Characters of extracted document text sent to the model. */
  maxDocumentChars: numberFromEnv('MAX_DOCUMENT_CHARS', 60_000),
  rateLimit: {
    windowMs: numberFromEnv('RATE_LIMIT_WINDOW_MINUTES', 10) * 60_000,
    verify: numberFromEnv('RATE_LIMIT_VERIFY', 30),
    upload: numberFromEnv('RATE_LIMIT_UPLOAD', 60),
  },
};
