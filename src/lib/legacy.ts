/**
 * Converts history saved by the first version of NLI (one localStorage key,
 * free-text answers) into the current session format.
 */
import type { AssistantMessage, AttachmentKind, Message, Session, UserMessage } from '../types';
import { newId } from './ids';

interface LegacyAttachment {
  type?: string;
  name?: string;
  mimeType?: string;
  textContent?: string;
}

interface LegacyMessage {
  id?: string;
  role?: string;
  content?: string;
  timestamp?: string;
  attachments?: LegacyAttachment[];
  credibilityScore?: number;
  aiDetection?: { isAI?: boolean; confidence?: number; reasoning?: string };
}

interface LegacySession {
  id?: string;
  title?: string;
  createdAt?: string;
  messages?: LegacyMessage[];
}

const KINDS: AttachmentKind[] = ['image', 'audio', 'video', 'document'];

function isoOrNow(value: unknown): string {
  const date = new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function migrateLegacySessions(raw: string): Session[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const seen = new Set<string>();
  const sessions: Session[] = [];

  for (const legacy of parsed as LegacySession[]) {
    const legacyMessages = (legacy.messages ?? []).filter(m => m.id !== 'welcome' && typeof m.content === 'string');
    // The old app saved the same chat more than once; keep one copy.
    const fingerprint = legacyMessages.map(m => `${m.role}:${m.content}`).join('|');
    if (legacyMessages.length === 0 || seen.has(fingerprint)) continue;
    seen.add(fingerprint);

    const messages: Message[] = [];
    let lastUserId = '';
    for (const m of legacyMessages) {
      const createdAt = isoOrNow(m.timestamp);
      if (m.role === 'user') {
        const user: UserMessage = {
          id: newId(),
          role: 'user',
          text: m.content ?? '',
          mode: 'deep',
          createdAt,
          attachments: (m.attachments ?? [])
            .filter(a => a.type !== 'link')
            .map(a => ({
              id: newId(),
              kind: KINDS.includes(a.type as AttachmentKind) ? (a.type as AttachmentKind) : 'document',
              name: a.name ?? 'attachment',
              mimeType: a.mimeType ?? '',
              size: 0,
              ref: a.textContent ? { kind: 'text', text: a.textContent, truncated: false } : { kind: 'text', text: '', truncated: false },
            })),
        };
        lastUserId = user.id;
        messages.push(user);
      } else {
        const extra: string[] = [];
        if (typeof m.credibilityScore === 'number') extra.push(`**Trust meter:** ${Math.round(m.credibilityScore)}%`);
        if (m.aiDetection) {
          extra.push(
            `**Robot check:** ${m.aiDetection.isAI ? 'looked computer-made' : 'looked human-made'}${
              m.aiDetection.reasoning ? `: ${m.aiDetection.reasoning}` : ''
            }`,
          );
        }
        const assistant: AssistantMessage = {
          id: newId(),
          role: 'assistant',
          replyTo: lastUserId,
          createdAt,
          legacyContent: [m.content, ...extra].join('\n\n'),
        };
        messages.push(assistant);
      }
    }

    const createdAt = isoOrNow(legacy.createdAt);
    sessions.push({
      id: newId(),
      title: (legacy.title ?? 'Earlier check').replace(/\.\.\.$/, '').trim() || 'Earlier check',
      createdAt,
      updatedAt: messages[messages.length - 1]?.createdAt ?? createdAt,
      messages,
    });
  }
  return sessions;
}
