import { FileState, type GoogleGenAI } from '@google/genai';
import mammoth from 'mammoth';
import { classifyFile, unsupportedReason } from '../shared/files';
import type { UploadRef } from '../shared/types';
import { config } from './config';
import { AppError } from './errors';

const POLL_INTERVAL_MS = 1500;
const MAX_PROCESSING_MS = 5 * 60_000;

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    }, { once: true });
  });
}

function textRef(text: string): UploadRef {
  const clean = text.replace(/\u0000/g, '').trim();
  if (!clean) throw new AppError('UNSUPPORTED_FILE', 'That file looks empty, so there is nothing to check.');
  return {
    kind: 'text',
    text: clean.slice(0, config.maxDocumentChars),
    truncated: clean.length > config.maxDocumentChars,
  };
}

export async function handleUpload(
  ai: GoogleGenAI,
  file: { name: string; mimeType: string; data: Buffer },
  signal: AbortSignal,
): Promise<UploadRef> {
  if (file.data.length === 0) throw new AppError('BAD_REQUEST', 'The file was empty.');
  const info = classifyFile(file.name, file.mimeType);

  switch (info.handling) {
    case 'text':
      return textRef(file.data.toString('utf8'));
    case 'docx': {
      try {
        const { value } = await mammoth.extractRawText({ buffer: file.data });
        return textRef(value);
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('UNSUPPORTED_FILE', 'That Word file could not be opened. Try saving it again or exporting a PDF.');
      }
    }
    case 'gemini':
      break;
    default:
      // convert-image should already be a PNG by the time it reaches us.
      throw new AppError('UNSUPPORTED_FILE', unsupportedReason(file.name), 415);
  }

  let uploaded = await ai.files.upload({
    file: new Blob([new Uint8Array(file.data)], { type: info.mimeType }),
    config: { mimeType: info.mimeType, displayName: file.name.slice(0, 100), abortSignal: signal },
  });

  // Videos and long audio need processing before they can be used.
  const deadline = Date.now() + MAX_PROCESSING_MS;
  while (uploaded.state === FileState.PROCESSING) {
    if (Date.now() > deadline) throw new AppError('UPSTREAM', 'That file is taking too long to process. Try a shorter clip.', 504);
    await sleep(POLL_INTERVAL_MS, signal);
    uploaded = await ai.files.get({ name: uploaded.name! });
  }
  if (uploaded.state === FileState.FAILED || !uploaded.uri) {
    throw new AppError('UNSUPPORTED_FILE', 'Gemini could not process that file. It may be damaged or in an unusual format.', 415);
  }

  return {
    kind: 'file',
    fileUri: uploaded.uri,
    mimeType: uploaded.mimeType ?? info.mimeType,
    expiresAt: uploaded.expirationTime,
  };
}
