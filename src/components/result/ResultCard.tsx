import { BookOpen, Check, ChevronDown, Copy, Heart, Lightbulb, RefreshCw, ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { formatDuration, reportAsText } from '../../lib/format';
import { cn } from '../../lib/utils';
import { VERDICT_STYLES } from '../../lib/verdicts';
import type { AssistantMessage, UserMessage, VerificationResult } from '../../types';
import { LazyMarkdown as Markdown } from '../LazyMarkdown';
import { SpeakButton } from '../SpeakButton';
import { RobotMeter, TrustMeter } from './Meters';
import { SearchQueries, SearchSuggestions, SharedLinks, SourceList } from './Sources';

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h4 className="font-display text-base font-semibold text-ink">{title}</h4>
        {aside}
      </div>
      {children}
    </section>
  );
}

function EvidenceSummary({ result }: { result: VerificationResult }) {
  const websites = new Set(result.sources.map(s => s.domain).filter(Boolean)).size || result.sources.length;
  if (result.sources.length === 0) return null;
  return (
    <p className="text-xs font-semibold text-ink-soft">
      {websites} website{websites === 1 ? '' : 's'}
      {result.citationCoverage > 0 && ` · ${Math.round(result.citationCoverage * 100)}% of the answer is linked to one`}
    </p>
  );
}

function speechFor(result: VerificationResult): string {
  const style = VERDICT_STYLES[result.verdict];
  const parts = [`${style.label}. ${style.kidLabel}.`, result.headline + '.', result.simpleSummary];
  if (result.reassurance) parts.push(result.reassurance);
  if (result.lesson) parts.push(`Detective tip: ${result.lesson}`);
  return parts.join(' ');
}

export function ResultCard({
  message,
  question,
  onFeedback,
  onRecheck,
  canRecheck,
}: {
  message: AssistantMessage;
  question?: UserMessage;
  onFeedback: (feedback: AssistantMessage['feedback']) => void;
  onRecheck: () => void;
  canRecheck: boolean;
}) {
  // Results saved before the kid-focused fields existed don't have them.
  const result: VerificationResult = { glossary: [], lesson: '', sensitive: false, reassurance: '', ...message.result! };
  const style = VERDICT_STYLES[result.verdict];
  const [grownUpOpen, setGrownUpOpen] = useState(false);
  const [allSources, setAllSources] = useState(false);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const showSource = (id: number) => {
    setAllSources(true);
    setHighlighted(null);
    requestAnimationFrame(() => {
      setHighlighted(id);
      document.getElementById(`src-${message.id}-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reportAsText(result, question));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article
      className="overflow-hidden rounded-[28px] rounded-tl-md border-4 border-cream-200 bg-white shadow-bubble"
      aria-label={`Answer: ${style.label}`}
    >
      {/* The answer, in kid-sized words */}
      <header className={cn('border-b-4 px-5 py-5 sm:px-6', style.banner)}>
        <div className="flex items-center gap-3">
          <span className="text-5xl leading-none" aria-hidden>
            {style.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn('font-display text-3xl font-bold leading-tight', style.accent)}>{style.label}</p>
            <p className="text-sm font-bold text-ink-soft">{style.kidLabel}</p>
          </div>
        </div>
        <h3 className="mt-4 font-display text-xl font-semibold leading-snug text-ink [text-wrap:balance]">{result.headline}</h3>
        {result.simpleSummary && <p className="mt-2 text-base leading-relaxed text-ink">{result.simpleSummary}</p>}
        <SpeakButton id={`result-${message.id}`} text={speechFor(result)} className="mt-4" />
      </header>

      <div className="space-y-6 px-5 py-5 sm:px-6">
        {result.sensitive && result.reassurance && (
          <div className="flex gap-3 rounded-2xl border-2 border-kids-pink/50 bg-kids-pink/10 p-4">
            <Heart size={22} className="mt-0.5 shrink-0 text-kids-pink" fill="currentColor" aria-hidden />
            <div>
              <p className="font-display font-semibold text-ink">Feeling worried?</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{result.reassurance}</p>
            </div>
          </div>
        )}

        {result.notices.length > 0 && (
          <div className="space-y-2">
            {result.notices.map(notice => (
              <p
                key={notice}
                className="flex gap-2 rounded-2xl border-2 border-verdict-misleading/30 bg-verdict-misleading-soft p-3 text-sm text-verdict-misleading-ink"
              >
                <TriangleAlert size={18} className="mt-px shrink-0" aria-hidden />
                {notice}
              </p>
            ))}
          </div>
        )}

        <div className={cn('grid gap-3', result.aiCheck.applicable && 'sm:grid-cols-2')}>
          <TrustMeter score={result.credibilityScore} />
          {result.aiCheck.applicable && <RobotMeter check={result.aiCheck} />}
        </div>

        {result.lesson && (
          <div className="flex gap-3 rounded-2xl bg-kids-yellow/25 p-4">
            <span className="text-3xl leading-none" aria-hidden>
              🕵️
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-700">Detective tip</p>
              <p className="mt-1 font-semibold leading-relaxed text-ink">{result.lesson}</p>
            </div>
          </div>
        )}

        {result.glossary.length > 0 && (
          <Section title="Words to know">
            <dl className="grid gap-2 sm:grid-cols-2">
              {result.glossary.map(entry => (
                <div key={entry.word} className="rounded-2xl border-2 border-kids-purple/60 bg-kids-purple/15 px-3 py-2">
                  <dt className="flex items-center gap-1.5 font-bold text-ink">
                    <BookOpen size={14} aria-hidden /> {entry.word}
                  </dt>
                  <dd className="text-sm text-ink-soft">{entry.meaning}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        {result.claims.length > 0 && (
          <Section title="What I checked">
            <ul className="space-y-2">
              {result.claims.map(claim => {
                const claimStyle = VERDICT_STYLES[claim.verdict];
                return (
                  <li key={claim.claim} className="rounded-2xl bg-cream-100/70 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 font-bold text-ink">{claim.claim}</p>
                      <span className={cn('shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold', claimStyle.pill)}>
                        <span aria-hidden>{claimStyle.emoji}</span> {claimStyle.label}
                      </span>
                    </div>
                    {claim.explanation && <p className="mt-1 text-sm text-ink-soft">{claim.explanation}</p>}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        <Section title="Where I found the proof 📚" aside={<EvidenceSummary result={result} />}>
          {result.sources.length > 0 ? (
            <SourceList
              sources={result.sources}
              messageId={message.id}
              highlighted={highlighted}
              expanded={allSources}
              onExpand={() => setAllSources(true)}
            />
          ) : (
            <p className="flex gap-2 rounded-2xl bg-cream-100 p-3 text-sm text-ink-soft">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />I didn't find any websites about this, so nothing here has proof yet.
            </p>
          )}
          {result.sharedLinks.length > 0 && (
            <div className="rounded-2xl bg-cream-100/70 p-3">
              <p className="mb-2 text-xs font-bold text-ink">Links you shared</p>
              <SharedLinks links={result.sharedLinks} />
            </div>
          )}
          {result.searchSuggestionsHtml && <SearchSuggestions html={result.searchSuggestionsHtml} />}
        </Section>

        {result.tips.length > 0 && (
          <Section title="Check it yourself">
            <ul className="space-y-1.5">
              {result.tips.map(tip => (
                <li key={tip} className="flex gap-2 text-sm text-ink-soft">
                  <Lightbulb size={16} className="mt-0.5 shrink-0 text-kids-yellow" fill="currentColor" aria-hidden />
                  {tip}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <div className="rounded-2xl border-2 border-dashed border-cream-300">
          <button
            type="button"
            onClick={() => setGrownUpOpen(open => !open)}
            aria-expanded={grownUpOpen}
            className="flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-3 text-left hover:bg-cream-100"
          >
            <span>
              <span className="block font-display font-semibold text-ink">For grown-ups: the full report</span>
              <span className="block text-xs text-ink-soft">Every step, with numbered links to the proof</span>
            </span>
            <ChevronDown size={20} className={cn('shrink-0 text-ink-soft transition-transform', grownUpOpen && 'rotate-180')} aria-hidden />
          </button>
          {grownUpOpen && (
            <div className="space-y-4 border-t-2 border-dashed border-cream-300 px-4 py-4">
              <Markdown text={result.report} onCite={showSource} />
              {result.searchQueries.length > 0 && <SearchQueries queries={result.searchQueries} />}
              <p className="text-[11px] text-ink-faint">
                Checked in {formatDuration(result.durationMs)} with {result.model}
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-cream-200 bg-cream-100/50 px-5 py-3 sm:px-6">
        <div className="flex items-center gap-1" role="group" aria-label="Did this help you?">
          <span className="mr-1 text-xs font-semibold text-ink-soft">Did this help?</span>
          <button
            type="button"
            onClick={() => onFeedback(message.feedback === 'helpful' ? undefined : 'helpful')}
            aria-pressed={message.feedback === 'helpful'}
            aria-label="Yes, it helped"
            className={cn(
              'rounded-xl p-2 transition-colors',
              message.feedback === 'helpful' ? 'bg-kids-green text-ink' : 'text-ink-faint hover:bg-kids-green/30',
            )}
          >
            <ThumbsUp size={16} />
          </button>
          <button
            type="button"
            onClick={() => onFeedback(message.feedback === 'not-helpful' ? undefined : 'not-helpful')}
            aria-pressed={message.feedback === 'not-helpful'}
            aria-label="No, it didn't help"
            className={cn(
              'rounded-xl p-2 transition-colors',
              message.feedback === 'not-helpful' ? 'bg-kids-pink text-white' : 'text-ink-faint hover:bg-kids-pink/30',
            )}
          >
            <ThumbsDown size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {canRecheck && (
            <button
              type="button"
              onClick={onRecheck}
              className="flex items-center gap-1.5 rounded-xl border-2 border-cream-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-cream-100"
            >
              <RefreshCw size={14} aria-hidden /> Check again
            </button>
          )}
          <button
            type="button"
            onClick={copy}
            className={cn(
              'flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition-colors',
              copied ? 'border-kids-green bg-kids-green text-ink' : 'border-cream-200 bg-white text-brand-700 hover:bg-cream-100',
            )}
          >
            {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </footer>
    </article>
  );
}
