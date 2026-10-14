import { describe, expect, it } from 'vitest';
import type { AssistantMessage, Message, UserMessage } from '../types';
import { buildHistory, sessionTitle } from './format';
import { migrateLegacySessions } from './legacy';

const oldSession = {
  id: '1',
  title: 'Is the moon made of chee...',
  createdAt: '2026-03-01T10:00:00.000Z',
  messages: [
    { id: 'welcome', role: 'assistant', content: 'Hi there!', timestamp: '2026-03-01T10:00:00.000Z' },
    { id: '2', role: 'user', content: 'Is the moon made of cheese?', timestamp: '2026-03-01T10:00:01.000Z', attachments: [] },
    {
      id: '3',
      role: 'assistant',
      content: '**VERDICT: False**\n\nNo.',
      timestamp: '2026-03-01T10:00:05.000Z',
      credibilityScore: 2,
      aiDetection: { isAI: false, confidence: 60, reasoning: 'Plain text.' },
    },
  ],
};

describe('migrateLegacySessions', () => {
  it('converts old sessions and drops the duplicate copies the old app saved', () => {
    const sessions = migrateLegacySessions(JSON.stringify([oldSession, { ...oldSession, id: '9' }]));
    expect(sessions).toHaveLength(1);
    const [session] = sessions;
    expect(session.title).toBe('Is the moon made of chee');
    expect(session.messages).toHaveLength(2);
    const [question, answer] = session.messages as [UserMessage, AssistantMessage];
    expect(question.text).toBe('Is the moon made of cheese?');
    expect(answer.replyTo).toBe(question.id);
    expect(answer.legacyContent).toContain('**Trust meter:** 2%');
  });

  it('ignores corrupt data', () => {
    expect(migrateLegacySessions('not json')).toEqual([]);
    expect(migrateLegacySessions('{"a":1}')).toEqual([]);
  });
});

describe('buildHistory', () => {
  const q = (id: string, text: string): UserMessage => ({ id, role: 'user', text, attachments: [], mode: 'deep', createdAt: '' });

  it('summarises answers and skips failed turns', () => {
    const messages: Message[] = [
      q('1', 'First question'),
      { id: 'a', role: 'assistant', replyTo: '1', createdAt: '', error: { code: 'NETWORK', message: 'x' } },
      q('2', 'Second question'),
      {
        id: 'b',
        role: 'assistant',
        replyTo: '2',
        createdAt: '',
        result: {
          verdict: 'TRUE',
          headline: 'Yes',
          simpleSummary: 'It is true.',
          claims: [],
        } as unknown as AssistantMessage['result'],
      },
    ];
    const history = buildHistory(messages);
    expect(history.map(t => t.role)).toEqual(['user', 'model']);
    expect(history[0].text).toBe('Second question');
    expect(history[1].text).toContain('Verdict: TRUE');
  });
});

describe('sessionTitle', () => {
  it('uses the question, or the first file name', () => {
    expect(sessionTitle('  Are   bats blind? ', [])).toBe('Are bats blind?');
    expect(sessionTitle('', ['shark.jpg'])).toBe('Check: shark.jpg');
    expect(sessionTitle('x'.repeat(80), []).length).toBeLessThanOrEqual(60);
  });
});
