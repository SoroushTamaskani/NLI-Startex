/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Paperclip } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import type { PreviewItem } from './components/AttachmentView';
import { Header, HealthBanner, Toasts } from './components/Chrome';
import { Composer } from './components/Composer';
import { EmptyState } from './components/EmptyState';
import EducationalSection from './components/EducationalSection';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GrownUpsGuide } from './components/GrownUpsGuide';
import { AssistantView, PendingCard, UserBubble } from './components/Messages';
import { PreviewModal } from './components/PreviewModal';
import { Sidebar } from './components/Sidebar';
import { useCheck } from './hooks/useCheck';
import { useDrafts } from './hooks/useDrafts';
import { useHealth, useToasts } from './hooks/useMisc';
import { useSessions } from './hooks/useSessions';
import { useSpeechInput } from './hooks/useSpeechInput';
import { saveFile } from './lib/db';
import { sessionTitle } from './lib/format';
import { newId } from './lib/ids';
import type { AssistantMessage, Audience, CheckMode, Message, UserMessage } from './types';

const MODE_KEY = 'nli_mode';
const AUDIENCE_KEY = 'nli_audience';

function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSetting(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not important enough to bother anyone about.
  }
}

function loadMode(): CheckMode {
  return readSetting(MODE_KEY) === 'quick' ? 'quick' : 'deep';
}

function loadAudience(): Audience {
  const saved = readSetting(AUDIENCE_KEY);
  return saved === 'young' || saved === 'teen' ? saved : 'kid';
}

/** Full-screen shell for the academy's error screen, so there is always a visible way out. */
function AcademyShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-cream p-6" role="dialog" aria-modal="true" aria-label="Truth Academy">
      <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-2xl px-4 py-2 font-bold text-brand-700 hover:bg-cream-100">
        Close ✕
      </button>
      <div className="max-w-md space-y-4 text-center">{children}</div>
    </div>
  );
}

function AcademyProblem({ onClose, onRetry }: { onClose: () => void; onRetry: () => void }) {
  const [cleared, setCleared] = useState(false);
  return (
    <AcademyShell onClose={onClose}>
      <p className="text-6xl" aria-hidden>
        🛠️
      </p>
      <h2 className="font-display text-2xl font-bold text-ink">Truth Academy hit a bump</h2>
      <p className="text-ink-soft">
        Something went wrong while opening it. Try again. If it keeps happening, starting fresh usually fixes it (this resets academy points and badges only).
      </p>
      <div className="flex flex-col justify-center gap-2 sm:flex-row">
        <button type="button" onClick={onRetry} className="rounded-2xl bg-brand-500 px-5 py-3 font-bold text-white shadow-bubble hover:bg-brand-600">
          Try again
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              ['nli_academy_v2', 'nli_points', 'nli_ai_spots', 'nli_badges'].forEach(key => localStorage.removeItem(key));
            } catch {
              // Nothing saved to clear.
            }
            setCleared(true);
            onRetry();
          }}
          className="rounded-2xl border-2 border-cream-300 bg-white px-5 py-3 font-bold text-ink hover:bg-cream-100"
        >
          {cleared ? 'Started fresh' : 'Start fresh'}
        </button>
      </div>
    </AcademyShell>
  );
}

export default function App() {
  const sessions = useSessions();
  const health = useHealth();
  const { toasts, push: toast, dismiss } = useToasts();
  const maxUploadMb = health.status === 'ready' || health.status === 'no-key' ? health.health.maxUploadMb : 100;
  const drafts = useDrafts(maxUploadMb, toast);
  const check = useCheck(sessions);

  const [input, setInput] = useState('');
  const [mode, setMode] = useState<CheckMode>(loadMode);
  const [audience, setAudience] = useState<Audience>(loadAudience);
  const [guideOpen, setGuideOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [academyOpen, setAcademyOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewItem | null>(null);
  const [dragDepth, setDragDepth] = useState(0);

  const scrollRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speech = useSpeechInput(setInput, toast);

  const { active } = sessions;
  const messages = active?.messages ?? [];
  const pendingHere = check.pending && check.pending.sessionId === active?.id ? check.pending : null;

  useEffect(() => writeSetting(MODE_KEY, mode), [mode]);
  useEffect(() => writeSetting(AUDIENCE_KEY, audience), [audience]);

  // Scroll to a new answer's start (it can be long); otherwise stick to the bottom.
  const lastMessage = messages[messages.length - 1];
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!lastMessage) {
      el.scrollTo({ top: 0 });
    } else if (lastMessage.role === 'assistant' && !pendingHere) {
      document.getElementById(`msg-${lastMessage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [lastMessage?.id, pendingHere?.replyTo, active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const disabledReason =
    !sessions.ready
      ? 'Loading your history…'
      : health.status === 'no-key'
        ? 'NLI is not connected to Gemini yet.'
        : health.status === 'offline'
          ? "Can't reach the NLI server."
          : undefined;

  const ask = useCallback(
    async (sessionId: string | null, question: UserMessage, earlier: Message[]) => {
      let id = sessionId;
      if (!id) id = sessions.createSession(sessionTitle(question.text, question.attachments.map(a => a.name)), question);
      else sessions.appendMessage(id, question);

      const answer = await check.run(id, question, earlier);
      if (!question.text.trim() && earlier.length === 0 && answer.result) sessions.renameSession(id, answer.result.headline);
    },
    [sessions, check],
  );

  const send = () => {
    if (check.pending || disabledReason || drafts.busy || drafts.hasErrors) return;
    const text = input.trim();
    if (!text && drafts.drafts.length === 0) return;
    if (speech.listening) speech.stop();

    const ready = drafts.takeAll();
    ready.forEach(d => void saveFile(d.id, d.file));
    const question: UserMessage = {
      id: newId(),
      role: 'user',
      text,
      mode,
      audience,
      createdAt: new Date().toISOString(),
      attachments: ready.map(d => ({ id: d.id, kind: d.kind, name: d.name, mimeType: d.mimeType, size: d.size, ref: d.ref! })),
    };
    setInput('');
    void ask(active?.id ?? null, question, messages);
  };

  /** Re-runs the question behind an answer. The answer is replaced if it's the latest message. */
  const retry = (answer: AssistantMessage) => {
    if (!active || check.pending) return;
    const index = messages.findIndex(m => m.id === answer.replyTo);
    const question = messages[index] as UserMessage | undefined;
    if (!question) return;
    if (messages[messages.length - 1]?.id === answer.id) {
      sessions.removeMessage(active.id, answer.id);
      void check.run(active.id, question, messages.slice(0, index));
    } else {
      void ask(active.id, { ...question, id: newId(), createdAt: new Date().toISOString() }, messages);
    }
  };

  const startNew = () => {
    sessions.setActiveId(null);
    setSidebarOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onDragEnter = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setDragDepth(d => d + 1);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragDepth(0);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) void drafts.addFiles(files);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-full overflow-hidden bg-cream">
        <Sidebar
          sessions={sessions.sessions}
          activeId={sessions.activeId}
          open={sidebarOpen}
          persistent={sessions.persistent}
          onClose={() => setSidebarOpen(false)}
          onSelect={id => {
            sessions.setActiveId(id);
            setSidebarOpen(false);
          }}
          onNew={startNew}
          onDelete={sessions.removeSession}
          onClearAll={() => void sessions.clearAll()}
          onOpenAcademy={() => {
            setSidebarOpen(false);
            setAcademyOpen(true);
          }}
          onOpenGuide={() => {
            setSidebarOpen(false);
            setGuideOpen(true);
          }}
          audience={audience}
          onAudienceChange={setAudience}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header onMenu={() => setSidebarOpen(true)} onNew={startNew} onAcademy={() => setAcademyOpen(true)} showNew={!!active} />
          <HealthBanner health={health} />

          <main
            ref={scrollRef}
            className="custom-scrollbar relative flex-1 overflow-y-auto"
            onDragEnter={onDragEnter}
            onDragOver={e => dragDepth > 0 && e.preventDefault()}
            onDragLeave={() => setDragDepth(d => Math.max(0, d - 1))}
            onDrop={onDrop}
          >
            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
              {!active && (
                <EmptyState
                  audience={audience}
                  onAudienceChange={setAudience}
                  onOpenGuide={() => setGuideOpen(true)}
                  onExample={text => {
                    setInput(text);
                    inputRef.current?.focus();
                  }}
                  onAttach={() => fileInputRef.current?.click()}
                />
              )}
              {messages.map(message => (
                <div key={message.id} id={`msg-${message.id}`} className="scroll-mt-4">
                    {message.role === 'user' ? (
                      <UserBubble message={message} onPreview={setPreview} />
                    ) : (
                      <AssistantView
                        message={message}
                        question={messages.find((m): m is UserMessage => m.id === message.replyTo && m.role === 'user')}
                        busy={!!check.pending}
                        onRetry={() => retry(message)}
                        onFeedback={feedback => sessions.updateAssistant(active!.id, message.id, { feedback })}
                      />
                  )}
                </div>
              ))}
              {pendingHere && <PendingCard pending={pendingHere} onStop={check.stop} />}
            </div>

            {dragDepth > 0 && (
              <div className="pointer-events-none absolute inset-3 z-30 flex flex-col items-center justify-center gap-3 rounded-[32px] border-4 border-dashed border-kids-blue bg-kids-blue/15 backdrop-blur-[1px]">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-kids-blue text-white shadow-lift">
                  <Paperclip size={30} aria-hidden />
                </span>
                <p className="font-display text-xl font-semibold text-ink">Drop files to check them</p>
              </div>
            )}
          </main>

          <Composer
            value={input}
            onChange={setInput}
            drafts={drafts.drafts}
            onAddFiles={files => void drafts.addFiles(files)}
            onRemoveDraft={drafts.remove}
            onRetryDraft={drafts.retry}
            mode={mode}
            onModeChange={setMode}
            onSend={send}
            onStop={check.stop}
            checking={!!check.pending}
            uploadsBusy={drafts.busy}
            uploadErrors={drafts.hasErrors}
            disabledReason={disabledReason}
            speech={speech}
            inputRef={inputRef}
            fileInputRef={fileInputRef}
          />
        </div>

        <Toasts toasts={toasts} onDismiss={dismiss} />

        {guideOpen && <GrownUpsGuide onClose={() => setGuideOpen(false)} />}
        {preview && <PreviewModal item={preview} onClose={() => setPreview(null)} />}
        {academyOpen && (
          <ErrorBoundary fallback={(_, reset) => <AcademyProblem onClose={() => setAcademyOpen(false)} onRetry={reset} />}>
            <EducationalSection onClose={() => setAcademyOpen(false)} />
          </ErrorBoundary>
        )}
      </div>
    </MotionConfig>
  );
}
