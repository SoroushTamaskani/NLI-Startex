import { useCallback, useEffect, useRef, useState } from 'react';
import { getHealth } from '../lib/api';
import { loadFile } from '../lib/db';
import type { HealthResponse } from '../types';

export type HealthState =
  | { status: 'loading' }
  | { status: 'offline' }
  | { status: 'ready' | 'no-key'; health: HealthResponse };

export function useHealth(): HealthState {
  const [state, setState] = useState<HealthState>({ status: 'loading' });
  useEffect(() => {
    getHealth()
      .then(health => setState({ status: health.hasApiKey ? 'ready' : 'no-key', health }))
      .catch(() => setState({ status: 'offline' }));
  }, []);
  return state;
}

/** Object URL for a stored attachment. `null` while loading, `'missing'` if it isn't stored. */
export function useFileUrl(id: string): string | null | 'missing' {
  const [url, setUrl] = useState<string | null | 'missing'>(null);
  useEffect(() => {
    let objectUrl: string | undefined;
    let cancelled = false;
    loadFile(id).then(blob => {
      if (cancelled) return;
      if (!blob) {
        setUrl('missing');
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return url;
}

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'error';
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const push = useCallback(
    (message: string, tone: Toast['tone'] = 'error') => {
      const id = nextId.current++;
      setToasts(prev => [...prev.slice(-2), { id, message, tone }]);
      setTimeout(() => dismiss(id), 6000);
    },
    [dismiss],
  );

  return { toasts, push, dismiss };
}

/** Calls `onEscape` when Escape is pressed while `active` is true. */
export function useEscape(active: boolean, onEscape: () => void) {
  const handler = useRef(onEscape);
  handler.current = onEscape;
  useEffect(() => {
    if (!active) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handler.current();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [active]);
}

/** Seconds since `startedAt`, ticking once a second. */
export function useElapsed(startedAt: number | undefined): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  return startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
}
