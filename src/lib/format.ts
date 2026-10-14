import type { HistoryTurn, Message, Session, UserMessage, VerificationResult } from '../types';
import { VERDICT_STYLES } from './verdicts';

export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function dateGroup(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'This week';
  return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

export function sessionTitle(text: string, attachmentNames: string[]): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean) return clean.length > 60 ? `${clean.slice(0, 57).trimEnd()}…` : clean;
  if (attachmentNames.length > 0) return `Check: ${attachmentNames[0]}`;
  return 'New check';
}

export function lastVerdictEmoji(session: Session): string | undefined {
  for (let i = session.messages.length - 1; i >= 0; i--) {
    const m = session.messages[i];
    if (m.role === 'assistant' && m.result) return VERDICT_STYLES[m.result.verdict].emoji;
  }
  return undefined;
}

/** A compact summary of earlier turns, so follow-up questions have context. */
export function buildHistory(messages: Message[]): HistoryTurn[] {
  const turns: HistoryTurn[] = [];
  for (const m of messages) {
    if (m.role === 'user') {
      const files = m.attachments.length ? `\n[Attached: ${m.attachments.map(a => a.name).join(', ')}]` : '';
      turns.push({ role: 'user', text: `${m.text}${files}`.trim() || '(attachments only)' });
    } else if (m.result) {
      const r = m.result;
      turns.push({
        role: 'model',
        text: `Verdict: ${r.verdict}. ${r.headline}\n${r.simpleSummary}\nClaims checked: ${r.claims.map(c => `${c.claim} (${c.verdict})`).join('; ')}`,
      });
    } else if (m.legacyContent) {
      turns.push({ role: 'model', text: m.legacyContent.slice(0, 1500) });
    } else {
      // A failed check: drop the question too so the history stays a clean back-and-forth.
      if (turns[turns.length - 1]?.role === 'user') turns.pop();
    }
  }
  return turns;
}

/** Report text for the clipboard: readable anywhere, with real links instead of citation markers. */
export function reportAsText(result: VerificationResult, question?: UserMessage): string {
  const style = VERDICT_STYLES[result.verdict];
  const lines = [`NLI fact-check: ${style.label} ${style.emoji}`, result.headline, '', result.simpleSummary];
  if (question?.text) lines.unshift(`Checked: "${question.text.trim()}"`, '');
  lines.push('', `Truth-o-meter: ${result.credibilityScore} out of 100`);
  if (result.aiCheck.applicable) lines.push(`AI check: ${result.aiCheck.assessment.replace('_', ' ').toLowerCase()} (${result.aiCheck.confidence}% sure)`);
  if (result.lesson) lines.push(`Detective tip: ${result.lesson}`);
  if (result.claims.length) {
    lines.push('', 'Claims:');
    result.claims.forEach(c => lines.push(`- ${c.claim}: ${VERDICT_STYLES[c.verdict].label}. ${c.explanation}`));
  }
  lines.push('', result.report.replace(/\[(\d+)\]\(#cite-\d+\)/g, '[$1]'));
  if (result.sources.length) {
    lines.push('', 'Sources:');
    result.sources.forEach(s => lines.push(`[${s.id}] ${s.domain || s.title}: ${s.url}`));
  }
  return lines.join('\n');
}
