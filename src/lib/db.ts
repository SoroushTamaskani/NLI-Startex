/**
 * Local persistence. Sessions and attachment files live in IndexedDB, which
 * has far more room than localStorage, so big videos no longer push old
 * history out. If IndexedDB is unavailable (some private modes), everything
 * still works in memory for the current visit.
 */
import type { Session } from '../types';
import { migrateLegacySessions } from './legacy';

const DB_NAME = 'nli';
const DB_VERSION = 1;
const SESSIONS = 'sessions';
const FILES = 'files';
const LEGACY_KEY = 'nli_sessions';

let dbPromise: Promise<IDBDatabase> | null = null;
const memoryFiles = new Map<string, Blob>();

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SESSIONS)) db.createObjectStore(SESSIONS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB blocked'));
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return openDb().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const request = action(tx.objectStore(store));
        tx.oncomplete = () => resolve(request ? request.result : (undefined as T));
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

export async function isPersistent(): Promise<boolean> {
  try {
    await openDb();
    return true;
  } catch {
    return false;
  }
}

export async function loadSessions(): Promise<Session[]> {
  let sessions: Session[] = [];
  try {
    sessions = (await run<Session[]>(SESSIONS, 'readonly', s => s.getAll())) ?? [];
  } catch {
    return [];
  }

  // One-time move of history saved by the first version of NLI.
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrateLegacySessions(legacy);
      await Promise.all(migrated.map(saveSession));
      localStorage.removeItem(LEGACY_KEY);
      sessions = [...sessions, ...migrated];
    }
  } catch {
    // Leave the old data where it is if anything goes wrong.
  }

  return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveSession(session: Session): Promise<void> {
  await run(SESSIONS, 'readwrite', s => s.put(session)).catch(() => undefined);
}

export async function deleteSession(session: Session): Promise<void> {
  await run(SESSIONS, 'readwrite', s => s.delete(session.id)).catch(() => undefined);
  const fileIds = session.messages.flatMap(m => (m.role === 'user' ? m.attachments.map(a => a.id) : []));
  await deleteFiles(fileIds);
}

export async function clearEverything(): Promise<void> {
  memoryFiles.clear();
  await run(SESSIONS, 'readwrite', s => s.clear()).catch(() => undefined);
  await run(FILES, 'readwrite', s => s.clear()).catch(() => undefined);
}

export async function saveFile(id: string, blob: Blob): Promise<void> {
  memoryFiles.set(id, blob);
  await run(FILES, 'readwrite', s => s.put(blob, id)).catch(() => undefined);
}

export async function loadFile(id: string): Promise<Blob | undefined> {
  const cached = memoryFiles.get(id);
  if (cached) return cached;
  try {
    return (await run<Blob | undefined>(FILES, 'readonly', s => s.get(id))) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function deleteFiles(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  ids.forEach(id => memoryFiles.delete(id));
  await run(FILES, 'readwrite', s => {
    ids.forEach(id => s.delete(id));
  }).catch(() => undefined);
}
