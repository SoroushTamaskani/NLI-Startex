import { GoogleGenAI } from '@google/genai';
import express, { type Request, type Response } from 'express';
import type { HealthResponse, VerifyEvent } from '../shared/types';
import { config } from './config';
import { AppError, httpStatusFor, toApiError } from './errors';
import { rateLimit } from './rateLimit';
import { handleUpload } from './upload';
import { parseVerifyRequest, verify } from './verify';

/** An AbortSignal that fires when the browser goes away, so we stop paying for work nobody will see. */
function abortOnDisconnect(req: Request, res: Response): AbortSignal {
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) controller.abort();
  });
  req.on('aborted', () => controller.abort());
  return controller.signal;
}

function requireAi(ai: GoogleGenAI | null): GoogleGenAI {
  if (!ai) {
    throw new AppError('NO_API_KEY', 'NLI is not set up yet: the server has no Gemini API key. Add GEMINI_API_KEY to .env.local and restart.', 503);
  }
  return ai;
}

export function createApiRouter(ai: GoogleGenAI | null = config.apiKey ? new GoogleGenAI({ apiKey: config.apiKey }) : null) {
  const router = express.Router();
  const { windowMs } = config.rateLimit;

  router.get('/health', (_req, res) => {
    const body: HealthResponse = {
      ok: true,
      hasApiKey: ai !== null,
      models: config.models,
      maxUploadMb: config.maxUploadMb,
    };
    res.json(body);
  });

  router.post(
    '/upload',
    rateLimit(config.rateLimit.upload, windowMs),
    express.raw({ type: () => true, limit: `${config.maxUploadMb}mb` }),
    async (req, res) => {
      try {
        const client = requireAi(ai);
        const rawName = String(req.header('x-file-name') ?? 'file');
        let name = rawName;
        try {
          name = decodeURIComponent(rawName);
        } catch {
          // keep the raw header value
        }
        const data = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
        const ref = await handleUpload(
          client,
          { name, mimeType: req.header('content-type') ?? '', data },
          abortOnDisconnect(req, res),
        );
        res.json({ ref });
      } catch (error) {
        const apiError = toApiError(error);
        if (!res.headersSent && !res.writableEnded) res.status(httpStatusFor(apiError)).json(apiError);
      }
    },
  );

  router.post('/verify', rateLimit(config.rateLimit.verify, windowMs), express.json({ limit: '2mb' }), async (req, res) => {
    let request;
    try {
      requireAi(ai);
      request = parseVerifyRequest(req.body);
    } catch (error) {
      const apiError = toApiError(error);
      res.status(httpStatusFor(apiError)).json(apiError);
      return;
    }

    // Stream progress as newline-delimited JSON so the UI can show what is happening.
    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    const send = (event: VerifyEvent) => {
      if (!res.writableEnded) res.write(`${JSON.stringify(event)}\n`);
    };

    const signal = abortOnDisconnect(req, res);
    // Keep proxies from closing a long, quiet connection.
    const keepAlive = setInterval(() => res.write('\n'), 15_000);
    try {
      const result = await verify(ai!, request, { signal, onStage: stage => send({ type: 'stage', stage }) });
      send({ type: 'result', result });
    } catch (error) {
      if (!signal.aborted) send({ type: 'error', error: toApiError(error) });
    } finally {
      clearInterval(keepAlive);
      res.end();
    }
  });

  router.use((_req, res) => {
    res.status(404).json({ code: 'BAD_REQUEST', message: 'Unknown API route.' });
  });

  // Body-parser errors (e.g. upload too large) land here.
  router.use((error: { type?: string; status?: number }, _req: Request, res: Response, _next: express.NextFunction) => {
    if (error?.type === 'entity.too.large') {
      res.status(413).json({ code: 'FILE_TOO_LARGE', message: `Files must be smaller than ${config.maxUploadMb} MB.` });
      return;
    }
    res.status(error?.status ?? 400).json({ code: 'BAD_REQUEST', message: 'That request could not be read.' });
  });

  return router;
}
