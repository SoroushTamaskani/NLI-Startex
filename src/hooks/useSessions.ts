import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clearEverything, deleteSession, isPersistent, loadSessions, saveSession } from '../lib/db';
import { newId } from '../lib/ids';
import type { AssistantMessage, Message, Session } from '../types';

function byRecent(a: Session, b: Session) {
  return b.updatedAt.localeCompare(a.updatedAt);
}

/**
 * Chat history. There is exactly one record per conversation: a session is
 * created when the first message is sent and updated in place afterwards,
 * so history never fills up with duplicate copies.
 */
export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const saved = useRef(new Map<string, Session>());

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadSessions(), isPersistent()]).then(([loaded, canPersist]) => {
      if (cancelled) return;
      saved.current = new Map(loaded.map(s => [s.id, s]));
      setSessions(loaded);
      setPersistent(canPersist);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Write through to IndexedDB whenever a session object changes or disappears.
  useEffect(() => {
    if (!ready) return;
    const next = new Map(sessions.map(s => [s.id, s]));
    for (const session of sessions) if (saved.current.get(session.id) !== session) void saveSession(session);
    for (const [id, session] of saved.current) if (!next.has(id)) void deleteSession(session);
    saved.current = next;
  }, [sessions, ready]);

  const update = useCallback((id: string, change: (session: Session) => Session) => {
    setSessions(prev => prev.map(s => (s.id === id ? change(s) : s)).sort(byRecent));
  }, []);

  const createSession = useCallback((title: string, first: Message): string => {
    const now = new Date().toISOString();
    const session: Session = { id: newId(), title, createdAt: now, updatedAt: now, messages: [first] };
    setSessions(prev => [session, ...prev]);
    setActiveId(session.id);
    return session.id;
  }, []);

  const appendMessage = useCallback(
    (id: string, message: Message) =>
      update(id, s => ({ ...s, updatedAt: new Date().toISOString(), messages: [...s.messages, message] })),
    [update],
  );

  const updateAssistant = useCallback(
    (id: string, messageId: string, patch: Partial<AssistantMessage>) =>
      setSessions(prev =>
        prev.map(s =>
          s.id !== id
            ? s
            : { ...s, messages: s.messages.map(m => (m.id === messageId && m.role === 'assistant' ? { ...m, ...patch } : m)) },
        ),
      ),
    [],
  );

  const removeMessage = useCallback(
    (id: string, messageId: string) => update(id, s => ({ ...s, messages: s.messages.filter(m => m.id !== messageId) })),
    [update],
  );

  const renameSession = useCallback(
    (id: string, title: string) => setSessions(prev => prev.map(s => (s.id === id ? { ...s, title } : s))),
    [],
  );

  const removeSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    setActiveId(current => (current === id ? null : current));
  }, []);

  const clearAll = useCallback(async () => {
    await clearEverything();
    saved.current = new Map();
    setSessions([]);
    setActiveId(null);
  }, []);

  const active = useMemo(() => sessions.find(s => s.id === activeId) ?? null, [sessions, activeId]);

  return {
    sessions,
    active,
    activeId,
    ready,
    persistent,
    setActiveId,
    createSession,
    appendMessage,
    updateAssistant,
    removeMessage,
    renameSession,
    removeSession,
    clearAll,
  };
}

export type SessionsApi = ReturnType<typeof useSessions>;
