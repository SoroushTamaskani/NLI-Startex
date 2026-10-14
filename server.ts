/**
 * NLI server: serves the React app and the /api routes that talk to Gemini.
 * The Gemini API key only ever lives here, never in the browser bundle.
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiRouter } from './server/app';
import { config } from './server/config';

const root = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const app = express();
  app.disable('x-powered-by');
  // Cloud Run / AI Studio sit behind one proxy; trust that hop so rate limits see the real client IP.
  app.set('trust proxy', 1);

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use('/api', createApiRouter());

  if (config.isProduction) {
    const dist = path.join(root, 'dist');
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`NLI is running at http://localhost:${config.port}`);
    if (!config.apiKey) console.warn('Warning: GEMINI_API_KEY is not set. Checks will fail until you add it to .env.local.');
  });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
