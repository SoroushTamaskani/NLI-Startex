# Handoff: cloud session → local Claude Code

This summarises a long Claude Code cloud session with the project owner (October 2026), so another session can continue the work. Teleporting the cloud session (below) brings the full conversation; this file is the short version, and it survives even if the cloud session is gone.

- Cloud session: `session_01VtpBTByZEvCmuAAZZEMTcz`
- Clickable demo (private Claude Artifact, sample answers, no key): https://claude.ai/artifact/PmynEPvpojm8ZyuzEBd3ET

## How to continue on the Mac

**Option A: bring the whole conversation (recommended).**

```bash
git clone https://github.com/SoroushTamaskani/NLI-Startex.git   # skip if already cloned
cd NLI-Startex
git status                                    # must be clean; teleport offers to stash if not
claude --teleport session_01VtpBTByZEvCmuAAZZEMTcz
```

This needs the Claude Code CLI signed in with the same claude.ai account (`claude auth login`). It loads the full chat history and checks out the session branch. After teleporting, run `git checkout main && git pull`: everything from the branch is on `main` too.

**Option B: start fresh.** Run `claude` in the repo. `CLAUDE.md` loads automatically; then ask Claude to read `docs/HANDOFF.md`.

**Running the app itself:** `npm install`, then `cp .env.example .env.local`, put the Gemini key in `.env.local`, then `npm run dev` and open http://localhost:3000.

## What the owner asked for, in order

1. **"Go through this project and brief me."** It was a Google AI Studio template, and the briefing found these problems:
   - The Gemini key was injected into the browser bundle.
   - Displayed sources were URLs the model wrote, which can be invented. The real grounding fallback could never run.
   - The progress bar was fake.
   - New-chat saved duplicate sessions.
   - Truth Academy used random stock photos that didn't match its questions, and its "Robot Scan" was fake.
2. **"Fix the bugs, make the sources trustworthy, improve everything incl. UI/UX."** Commit `1e31228`:
   - An Express server holds the key.
   - Two-pass verification.
   - Sources only from grounding metadata, with inline citations and evidence guardrails.
   - Real uploads through the Gemini Files API.
   - IndexedDB history.
   - New UI.
   - Tests.
3. **"Run it so I can see it."** The cloud container can't expose ports, so a demo build was published as a Claude Artifact with sample answers. Commit `e2d0d93` replaced `confirm()` dialogs with in-page buttons and set 16px phone gutters.
4. **"More kid-friendly tone, and improve Truth Academy with more details."** Commit `446e437`:
   - Answers fit the reader's age (picker: 6–8, 9–12, 13+), plus a detective tip, words to know, and a "Feeling worried?" note.
   - Read-aloud, the face-based Truth-o-meter, and a guide for parents and teachers.
   - Truth Academy 2.0:
     - 7 lessons.
     - 30 challenges in 3 formats.
     - Ranks, streaks, stars, unlocks, 14 badges, a daily challenge and a review of mistakes.
5. **"Truth Academy shows nothing and I get stuck."** Reproduced by freezing animations: the overlay started at `opacity: 0`, and Close waited on an exit animation. Fixed in `88aeaad` (no invisible starts, error boundaries).
6. **"None of the options work."** Fixed in `504c1d1`: Truth Academy is no longer lazy-loaded behind Suspense, because throttled timers delayed it.
7. **"Every button in Truth Academy shows 'Truth Academy hit a bump'"** (screenshot). The owner ran the real app with a real Gemini key. **Still unresolved; see below.**
8. "Put the work on main, and hand everything to a local session." That's this file.

## Open issue: Truth Academy error on every button (unresolved)

**Symptom:**
- The owner opens Truth Academy (it renders).
- Clicking any button inside it shows the error-boundary screen: "Truth Academy hit a bump" with Try again / Start fresh.
- The owner was running the real app with a Gemini key, probably `npm run dev` on their machine. Their browser is unknown.

**Could not reproduce.** These all worked, with no errors:
- the production build and the dev server (`npm run dev`, development React + StrictMode);
- Chromium desktop, plus phone emulation with touch taps;
- frozen animations, no animation frames, and slowed or stopped timers;
- a sandboxed iframe with a CSP like the Artifact viewer's;
- saved progress from the old academy version;
- a simulated Google Translate pass that wraps text in `<font>` tags.

**Ideas not yet checked:**
- Safari/WebKit specifics (only Chromium was available).
- A browser extension other than translate.
- A stale or mixed build: Vite's dependency cache after pulling new code. Try stopping the server, `rm -rf node_modules/.vite`, then `npm run dev`.
- The owner's local checkout being on an older commit.

**Next step: get the actual error text.**
- Either open the browser console (Chrome `Cmd+Option+J`; Safari needs "Show features for web developers" turned on, then `Cmd+Option+C`), click an academy button, and read the red error.
- Or apply `docs/pending/academy-error-details.patch`. It adds a "Details for grown-ups" section to the error screen showing the error message, browser and stack. The owner hadn't decided whether to keep it, so it's saved as a patch, not applied: `git apply docs/pending/academy-error-details.patch`.

## Decisions and facts worth knowing

- **Models** (configurable in `.env.local`):
  - `GEMINI_MODEL` defaults to `gemini-3.1-pro-preview` and is used for Careful checks.
  - `GEMINI_FAST_MODEL` defaults to `gemini-3.6-flash`. It's used for Fast checks and for the extraction step, and it falls back to the Pro model if unavailable.
  - Gemini 3 guidance: keep the default temperature; the pipeline uses `thinkingLevel` instead.
- Verdicts: TRUE, FALSE, MISLEADING, MIXED, UNVERIFIABLE ("Can't confirm"). If a factual check finds no sources, it becomes UNVERIFIABLE, with a kid-friendly notice.
- Google requires grounded answers to show its search suggestions. They're rendered in a sandboxed iframe on the result card (`SearchSuggestions`).
- The demo build swaps only the network layer (`scripts/demo/api.ts`). Its sample answers cite real Wikipedia pages and are labelled as samples. To refresh the artifact, run `npm run build:demo` and publish `dist-demo/nli-demo.html` to the same artifact URL.
- Testing approach that worked well:
  - A fake Gemini client injected into `createApiRouter(ai)` (see `server/app.test.ts`).
  - Playwright scripts against the demo or the dev server.
  - Chrome DevTools Protocol `Animation.setPlaybackRate(0)` to simulate viewers that pause animations.
- The owner prefers to be asked before anything is pushed to `main`. They approved putting this work on `main` (2026-10-16).

## Commits (oldest first)

| Commit | What it did |
| --- | --- |
| `1e31228` | Rebuild: server-side Gemini, verifiable sources, new UI |
| `e2d0d93` | In-page confirmations instead of `confirm()`, 16px phone gutters |
| `446e437` | Kid-first checking and Truth Academy 2.0 |
| `88aeaad` | Fix Truth Academy opening invisible and getting stuck |
| `504c1d1` | Open Truth Academy instantly instead of lazy-loading it |
| (this commit) | Handoff docs, `CLAUDE.md`, demo build script, pending patch |
