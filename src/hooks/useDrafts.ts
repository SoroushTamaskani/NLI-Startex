import { useCallback, useRef, useState } from 'react';
import { uploadFile } from '../lib/api';
import { newId } from '../lib/ids';
import { prepareFile } from '../lib/prepareFile';
import type { DraftAttachment } from '../types';

export const MAX_ATTACHMENTS = 10;

/** Attachments waiting in the composer. Files upload as soon as they are added. */
export function useDrafts(maxUploadMb: number, onError: (message: string) => void) {
  const [drafts, setDrafts] = useState<DraftAttachment[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const latest = useRef(drafts);
  latest.current = drafts;
  /** Files still being prepared (e.g. converted) that aren't in `drafts` yet. */
  const preparing = useRef(0);

  const patch = (id: string, change: Partial<DraftAttachment>) =>
    setDrafts(prev => prev.map(d => (d.id === id ? { ...d, ...change } : d)));

  const startUpload = useCallback((draft: DraftAttachment) => {
    const controller = new AbortController();
    controllers.current.set(draft.id, controller);
    uploadFile(draft.file, draft.name, draft.mimeType, {
      signal: controller.signal,
      onProgress: fraction =>
        patch(draft.id, fraction >= 1 ? { progress: 1, status: 'processing' } : { progress: fraction, status: 'uploading' }),
    })
      .then(ref => patch(draft.id, { ref, status: 'ready', progress: 1 }))
      .catch(error => {
        if ((error as Error)?.name === 'AbortError') return;
        patch(draft.id, { status: 'error', error: (error as Error).message });
      })
      .finally(() => controllers.current.delete(draft.id));
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        if (latest.current.length + preparing.current >= MAX_ATTACHMENTS) {
          onError(`You can attach up to ${MAX_ATTACHMENTS} files at a time.`);
          return;
        }
        preparing.current++;
        try {
          const prepared = await prepareFile(file, maxUploadMb);
          const draft: DraftAttachment = {
            id: newId(),
            kind: prepared.info.kind,
            name: prepared.name,
            mimeType: prepared.info.mimeType,
            size: prepared.blob.size,
            file: prepared.blob,
            previewUrl: URL.createObjectURL(prepared.blob),
            status: 'uploading',
            progress: 0,
          };
          latest.current = [...latest.current, draft];
          setDrafts(prev => [...prev, draft]);
          startUpload(draft);
        } catch (error) {
          onError((error as Error).message);
        } finally {
          preparing.current--;
        }
      }
    },
    [maxUploadMb, onError, startUpload],
  );

  const remove = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    const draft = latest.current.find(d => d.id === id);
    if (draft) URL.revokeObjectURL(draft.previewUrl);
    setDrafts(prev => prev.filter(d => d.id !== id));
  }, []);

  const retry = useCallback(
    (id: string) => {
      const draft = latest.current.find(d => d.id === id);
      if (!draft) return;
      patch(id, { status: 'uploading', progress: 0, error: undefined });
      startUpload(draft);
    },
    [startUpload],
  );

  /** Hands over the ready attachments and empties the composer. */
  const takeAll = useCallback((): DraftAttachment[] => {
    const ready = drafts.filter(d => d.status === 'ready' && d.ref);
    drafts.forEach(d => URL.revokeObjectURL(d.previewUrl));
    controllers.current.forEach(c => c.abort());
    controllers.current.clear();
    latest.current = [];
    setDrafts([]);
    return ready;
  }, [drafts]);

  const busy = drafts.some(d => d.status === 'uploading' || d.status === 'processing');
  const hasErrors = drafts.some(d => d.status === 'error');

  return { drafts, addFiles, remove, retry, takeAll, busy, hasErrors };
}
