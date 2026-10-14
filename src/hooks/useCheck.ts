import { useCallback, useRef, useState } from 'react';
import { toApiError, verify } from '../lib/api';
import { buildHistory } from '../lib/format';
import { newId } from '../lib/ids';
import type { AssistantMessage, Message, PendingCheck, UserMessage } from '../types';
import type { SessionsApi } from './useSessions';

/** Runs fact-checks, one at a time, and records the answer in the session. */
export function useCheck(sessions: Pick<SessionsApi, 'appendMessage'>) {
  const [pending, setPending] = useState<PendingCheck | null>(null);
  const controller = useRef<AbortController | null>(null);
  const { appendMessage } = sessions;

  const run = useCallback(
    async (sessionId: string, question: UserMessage, earlier: Message[]): Promise<AssistantMessage> => {
      const abort = new AbortController();
      controller.current = abort;
      setPending({ sessionId, replyTo: question.id, stage: 'starting', startedAt: Date.now(), mode: question.mode });

      const base = { id: newId(), role: 'assistant' as const, replyTo: question.id };
      let answer: AssistantMessage;
      try {
        const result = await verify(
          {
            text: question.text,
            attachments: question.attachments.map(a => ({ name: a.name, ref: a.ref })),
            history: buildHistory(earlier),
            mode: question.mode,
            audience: question.audience ?? 'kid',
          },
          { signal: abort.signal, onStage: stage => setPending(p => (p ? { ...p, stage } : p)) },
        );
        answer = { ...base, createdAt: new Date().toISOString(), result };
      } catch (error) {
        answer = { ...base, createdAt: new Date().toISOString(), error: toApiError(error) };
      } finally {
        controller.current = null;
        setPending(null);
      }
      appendMessage(sessionId, answer);
      return answer;
    },
    [appendMessage],
  );

  const stop = useCallback(() => controller.current?.abort(), []);

  return { pending, run, stop };
}
