import { FileText, Film, ImageOff, Maximize2, Music } from 'lucide-react';
import { useFileUrl } from '../hooks/useMisc';
import { formatBytes } from '../lib/format';
import type { AttachmentMeta } from '../types';

export interface PreviewItem {
  name: string;
  kind: AttachmentMeta['kind'];
  mimeType: string;
  url?: string;
  text?: string;
}

function DocumentChip({ attachment, url, onOpen }: { attachment: AttachmentMeta; url?: string; onOpen?: () => void }) {
  const text = attachment.ref.kind === 'text' ? attachment.ref.text : undefined;
  const canOpen = !!onOpen && (!!text || (!!url && attachment.mimeType === 'application/pdf'));
  return (
    <div className="flex w-64 max-w-full items-center gap-3 rounded-2xl border-2 border-white/60 bg-white/80 px-3 py-2.5">
      <span className="rounded-xl bg-kids-yellow/40 p-2 text-ink">
        <FileText size={20} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-ink">{attachment.name}</span>
        <span className="block text-[11px] font-semibold text-ink-soft">
          {attachment.mimeType === 'application/pdf' ? 'PDF' : 'Document'}
          {attachment.size > 0 && ` · ${formatBytes(attachment.size)}`}
        </span>
      </span>
      {canOpen && (
        <button type="button" onClick={onOpen} className="rounded-lg p-1.5 text-brand-700 hover:bg-cream-100" aria-label={`Open ${attachment.name}`}>
          <Maximize2 size={16} />
        </button>
      )}
    </div>
  );
}

export function AttachmentView({ attachment, onPreview }: { attachment: AttachmentMeta; onPreview: (item: PreviewItem) => void }) {
  const url = useFileUrl(attachment.id);
  const fileUrl = url && url !== 'missing' ? url : undefined;
  const preview = () =>
    onPreview({
      name: attachment.name,
      kind: attachment.kind,
      mimeType: attachment.mimeType,
      url: fileUrl,
      text: attachment.ref.kind === 'text' ? attachment.ref.text : undefined,
    });

  if (attachment.kind === 'document') return <DocumentChip attachment={attachment} url={fileUrl} onOpen={preview} />;

  if (url === 'missing') {
    const Icon = attachment.kind === 'image' ? ImageOff : attachment.kind === 'video' ? Film : Music;
    return (
      <div className="flex w-56 items-center gap-2 rounded-2xl border-2 border-white/60 bg-white/70 px-3 py-2 text-xs text-ink-soft">
        <Icon size={16} aria-hidden />
        <span className="min-w-0">
          <span className="block truncate font-bold text-ink">{attachment.name}</span>
          Not saved on this device
        </span>
      </div>
    );
  }
  if (!fileUrl) return <div className="h-32 w-40 animate-pulse rounded-2xl bg-white/60" aria-label="Loading attachment" />;

  if (attachment.kind === 'image') {
    return (
      <button type="button" onClick={preview} className="group relative overflow-hidden rounded-2xl" aria-label={`View ${attachment.name}`}>
        <img src={fileUrl} alt={attachment.name} className="h-36 max-w-[16rem] object-cover transition-transform group-hover:scale-105" />
      </button>
    );
  }
  if (attachment.kind === 'video') {
    return (
      <video src={fileUrl} controls preload="metadata" className="max-h-56 w-72 max-w-full rounded-2xl bg-black" aria-label={attachment.name} />
    );
  }
  return (
    <div className="w-72 max-w-full rounded-2xl bg-white/80 p-3">
      <p className="mb-2 flex items-center gap-2 truncate text-xs font-bold text-ink">
        <Music size={14} aria-hidden /> {attachment.name}
      </p>
      <audio src={fileUrl} controls preload="metadata" className="h-9 w-full" />
    </div>
  );
}
