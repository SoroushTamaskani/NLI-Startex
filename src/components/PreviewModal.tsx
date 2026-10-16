import { ChevronLeft, ChevronRight, Download, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useEscape } from '../hooks/useMisc';
import type { PreviewItem } from './AttachmentView';

const PAGE_SIZE = 3000;

function TextPreview({ text }: { text: string }) {
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(text.length / PAGE_SIZE));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end gap-1 border-b-2 border-cream-200 px-4 py-2">
        <button type="button" onClick={() => setZoom(z => Math.max(60, z - 10))} className="rounded-lg p-1.5 text-brand-700 hover:bg-cream-100" aria-label="Zoom out">
          <ZoomOut size={18} />
        </button>
        <span className="w-12 text-center text-xs font-bold text-ink" aria-live="polite">
          {zoom}%
        </span>
        <button type="button" onClick={() => setZoom(z => Math.min(200, z + 10))} className="rounded-lg p-1.5 text-brand-700 hover:bg-cream-100" aria-label="Zoom in">
          <ZoomIn size={18} />
        </button>
      </div>
      <div className="custom-scrollbar flex-1 overflow-y-auto bg-cream-100/40 p-6">
        <pre style={{ fontSize: `${(zoom / 100) * 14}px` }} className="whitespace-pre-wrap break-words font-mono leading-relaxed text-ink-soft">
          {text.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)}
        </pre>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-4 border-t-2 border-cream-200 py-2">
          <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="rounded-xl p-2 text-brand-700 hover:bg-cream-100 disabled:opacity-30" aria-label="Previous page">
            <ChevronLeft size={20} />
          </button>
          <span className="text-xs font-bold text-ink">
            Page {page + 1} of {pages}
          </span>
          <button type="button" disabled={page === pages - 1} onClick={() => setPage(p => p + 1)} className="rounded-xl p-2 text-brand-700 hover:bg-cream-100 disabled:opacity-30" aria-label="Next page">
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

export function PreviewModal({ item, onClose }: { item: PreviewItem; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEscape(true, onClose);
  useEffect(() => closeRef.current?.focus(), []);

  let body: React.ReactNode;
  if (item.kind === 'image' && item.url) {
    body = <img src={item.url} alt={item.name} className="mx-auto max-h-[75vh] max-w-full object-contain" />;
  } else if (item.kind === 'video' && item.url) {
    body = <video src={item.url} controls autoPlay className="mx-auto max-h-[75vh] max-w-full" />;
  } else if (item.mimeType === 'application/pdf' && item.url) {
    body = <iframe src={item.url} title={item.name} className="h-[75vh] w-full border-0" />;
  } else if (item.text) {
    body = <TextPreview text={item.text} />;
  } else {
    body = <p className="p-8 text-center text-ink-soft">This file isn't saved on this device.</p>;
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-8" role="dialog" aria-modal="true" aria-label={item.name}>
      <div onClick={onClose} className="absolute inset-0 bg-ink/60 backdrop-blur-sm" aria-hidden />
      <div
        className="rise-in relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border-4 border-brand-500 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b-4 border-cream-200 bg-cream-100 px-4 py-3">
          <h2 className="min-w-0 truncate font-display text-lg font-semibold text-ink">{item.name}</h2>
          <div className="flex items-center gap-1">
            {item.url && (
              <a href={item.url} download={item.name} className="rounded-xl p-2 text-brand-700 hover:bg-white" aria-label="Download">
                <Download size={20} />
              </a>
            )}
            <button ref={closeRef} type="button" onClick={onClose} className="rounded-xl p-2 text-brand-700 hover:bg-white" aria-label="Close preview">
              <X size={22} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">{body}</div>
      </div>
    </div>
  );
}
