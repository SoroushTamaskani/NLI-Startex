# NLI (No Lie AI): guide for Claude Code

NLI is a kid-friendly fact-checker. Kids (and families) send a claim, link, photo, video, audio clip or document. NLI researches it with Gemini + Google Search, gives an age-appropriate verdict with real sources, and checks whether media looks AI-made. **Truth Academy** is a built-in learning game (lessons, quizzes, ranks, badges).

The owner is building this for children. Keep the tone kind, simple and encouraging; keep the analysis rigorous and the sources real.

For the history of how the project got here, decisions made and open issues, read `docs/HANDOFF.md`.

## Commands

```bash
npm install
cp .env.example .env.local   # then set GEMINI_API_KEY
npm run dev                  # Express + Vite dev server on http://localhost:3000
npm test                     # Vitest (unit + API tests with a fake Gemini client)
npm run lint                 # tsc --noEmit (type-check everything)
npm run build                # production build of the browser app into dist/
npm start                    # serve dist/ in production mode (build first)
npm run build:demo           # self-contained demo with sample answers (no key needed) → dist-demo/
```

Before you say something works: run `npm run lint`, `npm test` and `npm run build`. For UI changes, check them in a real browser too (Playwright with Chromium is a good fit). Desktop alone isn't enough: also check a phone-sized viewport around 375px wide, with no horizontal scrolling.

## Architecture

- `server.ts`: Express entry. `/api` routes; Vite middleware in dev, `dist/` in production. **The Gemini key lives only on the server.** Never expose it to the browser (no `define` of the key in `vite.config.ts`).
- `server/app.ts`: `/api/health`, `/api/upload` (Gemini Files API, docx and text extraction), `/api/verify` (streams NDJSON progress events), plus per-IP rate limits.
- `server/verify.ts`: two-pass pipeline.
  1. A research call with `googleSearch` + `urlContext` tools writes a markdown report.
  2. An extraction call turns the report into JSON. If it fails, the verdict is read from the report instead.
  - Model fallback: if a model ID is unavailable on the key, the other model is used.
- `server/grounding.ts`: builds sources **only** from `groundingMetadata` / `urlContextMetadata`, never from URLs the model writes.
  - Inserts `[n](#cite-n)` citations from `groundingSupports`. Gemini's offsets are UTF-8 **byte** offsets, so they're converted to string positions.
  - Resolves Google redirect links to the real page addresses.
- `server/result.ts`: extraction schema, normalisation and guardrails.
  - Factual verdicts with no sources are downgraded to UNVERIFIABLE.
  - The score is kept within its verdict's range, and AI-detection confidence is capped at 85.
- `server/prompts.ts`: research and extraction instructions. Both are audience-aware (`young` 6–8, `kid` 9–12, `teen` 13+) and include child-safety rules.
- `shared/`: types and file-type rules used by both the server and the browser.
- `src/`: React 19 + Tailwind v4 + `motion`.
  - `App.tsx`: the app shell.
  - `components/result/`: the verdict card (Truth-o-meter, robot check, detective tip, words to know, sources).
  - `components/academy/`: Truth Academy content (`challenges.ts`, `lessons.ts`), pure progress logic (`progress.ts`, unit-tested), screens and question types.
  - `hooks/`: sessions, uploads, checks, voice input, read-aloud.
  - `lib/db.ts`: chat history and files in IndexedDB. Old localStorage history is migrated by `lib/legacy.ts`.
- `scripts/demo/`: demo build. It swaps `src/lib/api.ts` for `scripts/demo/api.ts`, which returns sample answers.

## Rules learned the hard way

- **Never make something start invisible.** Don't use `initial={{ opacity: 0 }}` on screens, overlays or modals, and don't make unmounting wait on an exit animation. Some embedded viewers pause animations, and Truth Academy opened as an invisible layer that blocked every click. Use the `.rise-in` CSS class instead (it slides, opacity stays 1).
- **Don't lazy-load Truth Academy.** React reveals Suspense content on a timer, and throttled timers left it stuck on the loading screen. It ships in the main bundle on purpose (`chunkSizeWarningLimit: 700` in `vite.config.ts`).
- **Don't use `window.confirm/alert/prompt`.** Embedded viewers block them. Use a two-step in-page button ("Tap again to…").
- Wrap every `localStorage`/IndexedDB access in try/catch. The app must work without storage.
- Content in `challenges.ts` and `lessons.ts` is factual teaching material for children: keep it accurate. The test in `progress.test.ts` enforces exactly one right answer per multiple-choice question.
- Sources shown to users must come from grounding metadata. Don't add a code path that displays model-written URLs as sources.

## Git

- Work is on `main`. The earlier feature branch was `claude/intelligent-hypatia-673x26`.
- Don't commit `.env.local` (it holds the real key; `.env*` is git-ignored except `.env.example`).
