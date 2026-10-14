/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Paperclip } from 'lucide-react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import type { PreviewItem } from './components/AttachmentView';
import { Header, HealthBanner, Toasts } from './components/Chrome';
import { Composer } from './components/Composer';
import { EmptyState } from './components/EmptyState';
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
import type { AssistantMessage, CheckMode, Message, UserMessage } from './types';

// Truth Academy is a separate screen; load it only when someone opens it.
const EducationalSection = lazy(() => import('./components/EducationalSection'));

const MODE_KEY = 'nli_mode';

function loadMode(): CheckMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'quick' ? 'quick' : 'deep';
  } catch {
    return 'deep';
  }
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

  useEffect(() => {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      // Not important enough to bother anyone about.
    }
  }, [mode]);

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

        <AnimatePresence>{preview && <PreviewModal item={preview} onClose={() => setPreview(null)} />}</AnimatePresence>
        <Suspense fallback={null}>
          <AnimatePresence>{academyOpen && <EducationalSection onClose={() => setAcademyOpen(false)} />}</AnimatePresence>
        </Suspense>
      </div>
    </MotionConfig>
  );
}
