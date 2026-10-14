import { lazy, Suspense, type ComponentProps } from 'react';

// The markdown renderer is fairly large and only needed once a report is opened.
const Markdown = lazy(() => import('./Markdown').then(m => ({ default: m.Markdown })));

export function LazyMarkdown(props: ComponentProps<typeof Markdown>) {
  return (
    <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-cream-100" aria-label="Loading report" />}>
      <Markdown {...props} />
    </Suspense>
  );
}
