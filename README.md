<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# NLI · No Lie AI

NLI is a friendly fact-checker for kids and families. Send it a claim, a link, a photo, a video, an audio clip or a document, and it:

1. **Checks whether it's true**: researches with Google Search (and reads any links you share), then gives a verdict of *True*, *False*, *Misleading*, *Mixed* or *Can't confirm*, with a 0–100 trust meter.
2. **Checks whether it was made by AI**: looks for concrete clues (garbled text, extra fingers, mismatched reflections…) and gives a hedged "robot check".
3. **Shows its work**: every source is a page Google Search actually returned, numbered citations link each sentence to the sources behind it, and a full report explains every step.

It also includes **Truth Academy**, a quiz with levels, points and badges that teaches kids the clues fact-checkers use.

View the app in AI Studio: https://ai.studio/apps/8696c392-78b1-4801-b69d-925bf62ba810

## Run locally

**Prerequisites:** Node.js 20 or newer.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` to your Gemini API key.
3. Start the app: `npm run dev`, then open http://localhost:3000

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Express server with Vite middleware (hot reload) on port 3000 |
| `npm run build` | Builds the browser app into `dist/` |
| `npm start` | Serves the built app in production mode (run `npm run build` first) |
| `npm test` | Runs the unit and API tests (Vitest) |
| `npm run lint` | Type-checks everything (`tsc --noEmit`) |

## How it works

```
Browser (React)                    server.ts (Express)                     Gemini API
───────────────                    ───────────────────                     ──────────
attach file ──── POST /api/upload ──► text/docx → extract text
                                     media/PDF → Files API upload ───────► files.upload
ask question ─── POST /api/verify ──► 1. research  (Google Search + URL context) ─► generateContent
             ◄── NDJSON progress ───  2. build sources & citations from grounding metadata
                                     3. structure (JSON verdict from the report) ─► generateContent
             ◄── result ──────────── 4. evidence guardrails
```

* **The API key stays on the server.** The browser only talks to `/api/*`, and the key is never bundled into the client.
* **Two passes.** The research pass writes a plain markdown report with Google Search grounding, which is the mode where Gemini returns reliable grounding supports. A second, cheaper call turns that report into a structured verdict. If structuring fails, the verdict is read from the report instead.
* **Progress streams** as newline-delimited JSON, so the UI shows what stage a check is at and can be stopped. Stopping also cancels the work on the server.

### Why the sources can be trusted

The first version displayed whatever URLs the model wrote into its answer, and those can be invented. Now (`server/grounding.ts`):

* **Sources only come from grounding metadata**: pages Google Search actually returned (`groundingChunks`) or pages the URL tool actually fetched (`urlContextMetadata`). URLs in the model's own text are never shown as sources.
* **Citations are positional.** `groundingSupports` say which sentence each source backs up. NLI converts Gemini's byte offsets correctly (so emoji and accents don't shift them), inserts numbered markers, and shows the exact sentences each source supports.
* **Real addresses.** Google's grounding redirect links are resolved on the server, so people see the real website before they click.
* **Evidence guardrails** (`server/result.ts`):
  * If a factual check comes back with no sources, the verdict is downgraded to *Can't confirm* and the reason is shown.
  * If little of the report is cited, a warning appears.
  * The trust score is kept within the range of its verdict.
  * AI-detection confidence is capped, because it is a judgement, not a measurement.
* **Transparency.** The UI shows how many websites were used, what share of the report is cited, the exact search queries, which shared links could or couldn't be read, and Google's search suggestions (which Google requires to be shown alongside grounded answers).

## Project layout

```
server.ts               Express entry: /api routes + Vite (dev) or dist/ (prod)
server/
  app.ts                API routes: /health, /upload, /verify (+ rate limiting)
  verify.ts             The research → structure pipeline, model fallback
  grounding.ts          Sources and citations from grounding metadata
  result.ts             Structured-output schema, normalisation, evidence guardrails
  upload.ts             File handling (Files API, docx/text extraction)
  prompts.ts            System instructions
shared/                 Types and file rules used by both server and browser
src/
  App.tsx               App shell
  components/           Chat UI, result card, composer, sidebar, Truth Academy
  hooks/                Sessions, uploads, checks, voice input
  lib/                  API client, IndexedDB storage, formatting
```

History and attachments are stored in the browser's IndexedDB, so large files don't push old checks out the way they did with `localStorage`. History saved by the first version is migrated automatically.

## Limits worth knowing

* AI-generated media detection is a model's judgement based on visible or audible clues. It can be wrong, and the app says so.
* Uploaded files are stored by the Gemini Files API for about 48 hours, so "Try again" on an old check may ask you to attach the file again.
* The built-in rate limiter is per server instance. For a public deployment, put proper abuse protection in front of it.
