import { AlertCircle, FileText, Film, Loader2, Mic, MicOff, Music, Paperclip, RotateCcw, Send, Square, X } from 'lucide-react';
import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { ACCEPT_ATTRIBUTE } from '../../shared/files';
import { cn } from '../lib/utils';
import type { CheckMode, DraftAttachment } from '../types';

function DraftChip({ draft, onRemove, onRetry }: { draft: DraftAttachment; onRemove: () => void; onRetry: () => void }) {
  const Icon = draft.kind === 'video' ? Film : draft.kind === 'audio' ? Music : FileText;
  const statusText =
    draft.status === 'uploading'
      ? `Uploading ${Math.round(draft.progress * 100)}%`
      : draft.status === 'processing'
        ? 'Getting it ready…'
        : draft.status === 'error'
          ? draft.error
          : 'Ready';
  return (
    <li
      className={cn(
        'relative flex w-56 items-center gap-2 overflow-hidden rounded-2xl border-2 bg-white p-2 pr-1',
        draft.status === 'error' ? 'border-verdict-false/40' : 'border-cream-200',
      )}
    >
      {draft.kind === 'image' ? (
        <img src={draft.previewUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream-100 text-brand-700">
          <Icon size={18} aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-ink">{draft.name}</span>
        <span
          className={cn('block truncate text-[11px]', draft.status === 'error' ? 'text-verdict-false-ink' : 'text-ink-faint')}
          title={draft.status === 'error' ? draft.error : undefined}
        >
          {statusText}
        </span>
      </span>
      {draft.status === 'error' && (
        <button type="button" onClick={onRetry} className="rounded-lg p-1.5 text-brand-700 hover:bg-cream-100" aria-label={`Retry uploading ${draft.name}`}>
          <RotateCcw size={14} />
        </button>
      )}
      {draft.status === 'processing' && <Loader2 size={14} className="animate-spin text-brand-500" aria-hidden />}
      <button type="button" onClick={onRemove} className="rounded-lg p-1.5 text-ink-faint hover:bg-cream-100 hover:text-ink" aria-label={`Remove ${draft.name}`}>
        <X size={14} />
      </button>
      {(draft.status === 'uploading' || draft.status === 'processing') && (
        <span className="absolute inset-x-0 bottom-0 h-1 bg-cream-100" aria-hidden>
          <span className="block h-full bg-brand-500 transition-all" style={{ width: `${Math.round(draft.progress * 100)}%` }} />
        </span>
      )}
    </li>
  );
}

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  drafts: DraftAttachment[];
  onAddFiles: (files: File[]) => void;
  onRemoveDraft: (id: string) => void;
  onRetryDraft: (id: string) => void;
  mode: CheckMode;
  onModeChange: (mode: CheckMode) => void;
  onSend: () => void;
  onStop: () => void;
  checking: boolean;
  uploadsBusy: boolean;
  uploadErrors: boolean;
  disabledReason?: string;
  speech: { supported: boolean; listening: boolean; start: (text: string) => void; stop: () => void };
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function Composer(props: ComposerProps) {
  const { value, onChange, drafts, mode, checking, speech, inputRef, fileInputRef } = props;
  const hasContent = !!value.trim() || drafts.length > 0;
  const blocked = !!props.disabledReason || props.uploadsBusy || props.uploadErrors;
  const canSend = hasContent && !blocked && !checking;
  const hint = props.disabledReason
    ? props.disabledReason
    : props.uploadErrors
      ? 'Remove or retry the file that failed before checking.'
      : props.uploadsBusy
        ? 'Waiting for files to finish uploading…'
        : undefined;

  // Grow the box with its content, up to a limit.
  const textareaRef = inputRef;
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value, textareaRef]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) props.onSend();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files);
    if (files.length > 0) {
      e.preventDefault();
      props.onAddFiles(files);
    }
  };

  const modeButton = (value: CheckMode, label: string, title: string) => (
    <button
      type="button"
      onClick={() => props.onModeChange(value)}
      aria-pressed={mode === value}
      title={title}
      className={cn(
        'whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold transition-colors sm:px-3',
        mode === value ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink',
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="border-t-4 border-cream-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-6">
      <div className="mx-auto max-w-3xl">
        {drafts.length > 0 && (
          <ul className="custom-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1" aria-label="Attached files">
            {drafts.map(d => (
              <DraftChip key={d.id} draft={d} onRemove={() => props.onRemoveDraft(d.id)} onRetry={() => props.onRetryDraft(d.id)} />
            ))}
          </ul>
        )}

        <div
          className={cn(
            'rounded-[26px] border-4 bg-cream-100 transition-colors focus-within:border-brand-500',
            speech.listening ? 'border-kids-pink' : 'border-brand-100',
          )}
        >
          <label htmlFor="composer" className="sr-only">
            What do you want to check?
          </label>
          <textarea
            id="composer"
            ref={inputRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            rows={1}
            maxLength={20000}
            placeholder={speech.listening ? 'Listening… 👂' : 'Paste a claim, a link, or a question to check 🕵️'}
            className="custom-scrollbar block max-h-[200px] min-h-[52px] w-full resize-none bg-transparent px-5 pb-1 pt-3.5 text-base font-semibold text-ink placeholder:font-medium placeholder:text-ink-faint focus:outline-none focus-visible:outline-none"
          />
          <div className="flex items-center gap-1 px-2 pb-2 sm:gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl p-2.5 text-brand-700 hover:bg-white"
              aria-label="Attach a photo, video, audio or document"
              title="Attach a photo, video, audio or document"
            >
              <Paperclip size={20} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT_ATTRIBUTE}
              className="hidden"
              onChange={e => {
                props.onAddFiles(Array.from(e.target.files ?? []));
                e.target.value = '';
              }}
            />
            {speech.supported && (
              <button
                type="button"
                onClick={() => (speech.listening ? speech.stop() : speech.start(value))}
                aria-pressed={speech.listening}
                className={cn('rounded-2xl p-2.5', speech.listening ? 'bg-kids-pink text-white' : 'text-brand-700 hover:bg-white')}
                aria-label={speech.listening ? 'Stop voice typing' : 'Type with your voice'}
                title={speech.listening ? 'Stop voice typing' : 'Type with your voice'}
              >
                {speech.listening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            )}
            <div className="ml-1 flex rounded-full bg-cream-300/60 p-0.5" role="group" aria-label="How thorough should the check be?">
              {modeButton('deep', '🔬 Deep', 'Deep check: slower, more careful research')}
              {modeButton('quick', '⚡ Quick', 'Quick check: faster, lighter research')}
            </div>
            <div className="flex-1" />
            {checking ? (
              <button
                type="button"
                onClick={props.onStop}
                className="flex items-center gap-2 whitespace-nowrap rounded-2xl bg-ink px-4 py-2.5 text-sm font-bold text-white hover:bg-ink-soft"
              >
                <Square size={14} fill="currentColor" aria-hidden /> <span className="hidden min-[400px]:inline">Stop</span>
                <span className="sr-only min-[400px]:hidden">Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={props.onSend}
                disabled={!canSend}
                className="flex items-center gap-2 whitespace-nowrap rounded-2xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-bubble transition-colors hover:bg-brand-600 disabled:bg-cream-300 disabled:text-ink-faint disabled:shadow-none"
              >
                <Send size={16} aria-hidden /> <span className="hidden min-[400px]:inline">Check it</span>
                <span className="sr-only min-[400px]:hidden">Check it</span>
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 flex min-h-4 items-center justify-center gap-1.5 text-center text-[11px] text-ink-faint" aria-live="polite">
          {hint ? (
            <>
              <AlertCircle size={12} aria-hidden /> {hint}
            </>
          ) : (
            'NLI can make mistakes. Always look at the sources, and ask a grown-up if something worries you.'
          )}
        </p>
      </div>
    </div>
  );
}
