import { Check, ChevronDown, Copy, Lightbulb, RefreshCw, ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { formatDuration, reportAsText } from '../../lib/format';
import { cn } from '../../lib/utils';
import { VERDICT_STYLES } from '../../lib/verdicts';
import type { AssistantMessage, UserMessage, VerificationResult } from '../../types';
import { LazyMarkdown as Markdown } from '../LazyMarkdown';
import { RobotMeter, TrustMeter } from './Meters';
import { SearchQueries, SearchSuggestions, SharedLinks, SourceList } from './Sources';

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-bold uppercase tracking-widest text-brand-700">{title}</h4>
        {aside}
      </div>
      {children}
    </section>
  );
}

function EvidenceSummary({ result }: { result: VerificationResult }) {
  const domains = new Set(result.sources.map(s => s.domain).filter(Boolean)).size;
  if (result.sources.length === 0) {
    return (
      <p className="flex items-center gap-2 text-xs font-semibold text-verdict-misleading-ink">
        <TriangleAlert size={14} aria-hidden /> No web sources were found for this check.
      </p>
    );
  }
  return (
    <p className="text-xs font-semibold text-ink-soft">
      Backed by {result.sources.length} source{result.sources.length === 1 ? '' : 's'}
      {domains > 1 ? ` from ${domains} websites` : ''}
      {result.citationCoverage > 0 && ` · ${Math.round(result.citationCoverage * 100)}% of the report is linked to a source`}
    </p>
  );
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
  const result = message.result!;
  const style = VERDICT_STYLES[result.verdict];
  const [reportOpen, setReportOpen] = useState(false);
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
    <article className="overflow-hidden rounded-[28px] rounded-tl-md border-4 border-cream-200 bg-white shadow-bubble" aria-label={`Verdict: ${style.label}`}>
      {/* Verdict */}
      <header className={cn('border-b-4 px-5 py-4 sm:px-6', style.banner)}>
        <div className="flex items-start gap-3">
          <span className="text-4xl leading-none" aria-hidden>
            {style.emoji}
          </span>
          <div className="min-w-0">
            <p className={cn('font-display text-2xl font-bold leading-tight', style.accent)}>{style.label}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">{style.kidLabel}</p>
          </div>
        </div>
        <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ink">{result.headline}</h3>
        {result.simpleSummary && <p className="mt-1 leading-relaxed text-ink-soft">{result.simpleSummary}</p>}
      </header>

      <div className="space-y-6 px-5 py-5 sm:px-6">
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

        {result.claims.length > 0 && (
          <Section title="What I checked">
            <ul className="space-y-2">
              {result.claims.map(claim => {
                const claimStyle = VERDICT_STYLES[claim.verdict];
                return (
                  <li key={claim.claim} className="rounded-2xl bg-cream-100/70 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 text-sm font-bold text-ink">{claim.claim}</p>
                      <span className={cn('shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold', claimStyle.pill)}>
                        {claimStyle.emoji} {claimStyle.label}
                      </span>
                    </div>
                    {claim.explanation && <p className="mt-1 text-sm text-ink-soft">{claim.explanation}</p>}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        <Section title="Where I checked 📚" aside={<EvidenceSummary result={result} />}>
          {result.sources.length > 0 ? (
            <SourceList
              sources={result.sources}
              messageId={message.id}
              highlighted={highlighted}
              expanded={allSources}
              onExpand={() => setAllSources(true)}
            />
          ) : (
            <p className="rounded-2xl bg-cream-100 p-3 text-sm text-ink-soft">
              NLI didn't find web pages about this, so nothing here is backed by a source.
            </p>
          )}
          {result.sharedLinks.length > 0 && (
            <div className="rounded-2xl bg-cream-100/70 p-3">
              <p className="mb-2 text-xs font-bold text-ink">Links you shared</p>
              <SharedLinks links={result.sharedLinks} />
            </div>
          )}
          {result.searchQueries.length > 0 && <SearchQueries queries={result.searchQueries} />}
          {result.searchSuggestionsHtml && <SearchSuggestions html={result.searchSuggestionsHtml} />}
        </Section>

        <div className="rounded-2xl border-2 border-cream-200">
          <button
            type="button"
            onClick={() => setReportOpen(open => !open)}
            aria-expanded={reportOpen}
            className="flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-3 text-left font-display font-semibold text-ink hover:bg-cream-100"
          >
            <span>📄 Full report{reportOpen ? '' : ': see every step and citation'}</span>
            <ChevronDown size={20} className={cn('transition-transform', reportOpen && 'rotate-180')} aria-hidden />
          </button>
          {reportOpen && (
            <div className="border-t-2 border-cream-200 px-4 py-4">
              <Markdown text={result.report} onCite={showSource} />
            </div>
          )}
        </div>

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
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-cream-200 bg-cream-100/50 px-5 py-3 sm:px-6">
        <div className="flex items-center gap-1" role="group" aria-label="Was this check helpful?">
          <span className="mr-1 text-xs font-semibold text-ink-soft">Helpful?</span>
          <button
            type="button"
            onClick={() => onFeedback(message.feedback === 'helpful' ? undefined : 'helpful')}
            aria-pressed={message.feedback === 'helpful'}
            aria-label="Yes, helpful"
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
            aria-label="No, not helpful"
            className={cn(
              'rounded-xl p-2 transition-colors',
              message.feedback === 'not-helpful' ? 'bg-kids-pink text-white' : 'text-ink-faint hover:bg-kids-pink/30',
            )}
          >
            <ThumbsDown size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-ink-faint sm:inline" title={result.model}>
            {formatDuration(result.durationMs)} · {result.model}
          </span>
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
            {copied ? 'Copied!' : 'Copy report'}
          </button>
        </div>
      </footer>
    </article>
  );
}
