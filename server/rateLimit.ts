import type { NextFunction, Request, Response } from 'express';

/**
 * Small fixed-window, per-IP limiter. It protects the shared Gemini key from
 * runaway use; it is not a substitute for real abuse protection at scale.
 */
export function rateLimit(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count++;
    if (entry.count > limit) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000).toString());
      res.status(429).json({
        code: 'RATE_LIMITED',
        message: 'You have sent lots of checks in a short time. Take a little break and try again in a few minutes.',
      });
      return;
    }
    next();
  };
}
