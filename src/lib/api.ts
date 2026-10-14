import type { ApiError, ErrorCode, HealthResponse, UploadRef, VerificationResult, VerifyEvent, VerifyRequest, VerifyStage } from '../types';

export class RequestError extends Error implements ApiError {
  constructor(
    public code: ErrorCode,
    message: string,
  ) {
    super(message);
  }

  toJSON(): ApiError {
    return { code: this.code, message: this.message };
  }
}

const NETWORK_ERROR = new RequestError('NETWORK', "NLI can't reach its server. Check your internet connection and try again.");

function isApiError(value: unknown): value is ApiError {
  return !!value && typeof value === 'object' && typeof (value as ApiError).code === 'string' && typeof (value as ApiError).message === 'string';
}

async function errorFromResponse(response: Response): Promise<RequestError> {
  try {
    const body = await response.json();
    if (isApiError(body)) return new RequestError(body.code, body.message);
  } catch {
    // fall through
  }
  if (response.status === 413) return new RequestError('FILE_TOO_LARGE', 'That file is too big for NLI.');
  return new RequestError('UPSTREAM', `NLI's server had a problem (${response.status}). Please try again.`);
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof RequestError) return error.toJSON();
  if ((error as Error)?.name === 'AbortError') return { code: 'CANCELLED', message: 'You stopped this check.' };
  return NETWORK_ERROR.toJSON();
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch('/api/health');
  if (!response.ok) throw await errorFromResponse(response);
  return response.json();
}

/** Uploads one file with real progress reporting (fetch can't report upload progress yet). */
export function uploadFile(
  file: Blob,
  name: string,
  mimeType: string,
  options: { onProgress: (fraction: number) => void; signal: AbortSignal },
): Promise<UploadRef> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.setRequestHeader('Content-Type', mimeType || 'application/octet-stream');
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(name));
    xhr.responseType = 'json';

    xhr.upload.onprogress = event => {
      if (event.lengthComputable) options.onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      const body = xhr.response;
      if (xhr.status >= 200 && xhr.status < 300 && body?.ref) resolve(body.ref as UploadRef);
      else if (isApiError(body)) reject(new RequestError(body.code, body.message));
      else if (xhr.status === 413) reject(new RequestError('FILE_TOO_LARGE', 'That file is too big for NLI.'));
      else reject(new RequestError('UPSTREAM', 'The upload failed. Please try again.'));
    };
    xhr.onerror = () => reject(NETWORK_ERROR);
    xhr.onabort = () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));

    if (options.signal.aborted) {
      xhr.abort();
      return;
    }
    options.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

/** Runs a check and reports progress from the server's NDJSON stream. */
export async function verify(
  request: VerifyRequest,
  options: { signal: AbortSignal; onStage: (stage: VerifyStage) => void },
): Promise<VerificationResult> {
  let response: Response;
  try {
    response = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error;
    throw NETWORK_ERROR;
  }
  if (!response.ok || !response.body) throw await errorFromResponse(response);

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let result: VerificationResult | undefined;

  const handle = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as VerifyEvent;
    if (event.type === 'stage') options.onStage(event.stage);
    else if (event.type === 'result') result = event.result;
    else if (event.type === 'error') throw new RequestError(event.error.code, event.error.message);
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        handle(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
      }
    }
    handle(buffer);
  } catch (error) {
    if (error instanceof RequestError || (error as Error)?.name === 'AbortError') throw error;
    throw NETWORK_ERROR;
  }

  if (!result) throw new RequestError('UPSTREAM', 'The check ended before an answer arrived. Please try again.');
  return result;
}
