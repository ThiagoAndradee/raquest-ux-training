# ROADMAP — self-improvement loop

This file is the **memory between iterations** for the autonomous agent that keeps improving this app.
Each run: read this file → do the **top open item** → verify → commit → add new ideas → stop.

## North Star (what "better" means here)
A polished, self-contained, bilingual (EN/PT) gamified training app for RAQUEST — delightful,
accessible, fast, and easy to author. "More advanced" = more useful for a learner and easier to extend,
**not** more complex for its own sake.

## Rules per iteration (do NOT skip)
1. Pick the **single highest-value open item** from "Backlog" (top of list). One focused improvement per run.
2. Implement it fully. Keep the app **self-contained** and runnable with `npm run dev` (react-scripts).
3. **Verify**: `npm run build` must pass with no new errors before you commit. If it breaks, fix it in the same run.
4. **Do not break existing features** (course flow, tax101, XP/badges, certificate, EN/PT). Manually reason through the happy path.
5. **Commit** with a clear message: `feat/fix/refactor: <what changed>`. One improvement = one commit.
6. Write **clean code** — no placeholder junk, no `// DEMO`, no commented-out mock blocks.
7. After committing: move the item to "Done log" (with date) and **append 2–3 fresh ideas** to "Backlog" or "Ideas parking lot".
8. Never touch: `dubbing/` outputs, `public/audio/*`, `public/videos/*` (generated assets).

## Backlog (top = next to do)
1. Persist learner progress across reloads (localStorage): current chapter, XP, badges, name/email — with a "resume" prompt.
2. Full accessibility pass: keyboard navigation for all interactive elements, focus states, ARIA labels, prefers-reduced-motion.
3. Quiz results screen: per-chapter breakdown (got/missed) with the correct answers and the "why".
4. Spaced-repetition mode for the flashcards (review the ones marked "missed" first).
5. Mobile polish: verify every screen at 375px width; fix any overflow / tap-target issues.
6. Sound design toggle: subtle correct/wrong/level-up sounds (Tone.js or short samples), off by default, remembered.
7. Authoring ergonomics: validate `content.js` at startup (dev only) — warn if a chapter is missing a field.

## Ideas parking lot (unranked — pull into Backlog when relevant)
- Light/dark theme toggle.
- Confidence rating on each quiz answer → weight the review.
- Export/print a nicer certificate (logo, border, QR to verify).
- More quiz types (match pairs, fill-in-the-blank).
- Per-learner analytics event on finish (which questions were hard).
- A tiny "admin/authoring" screen to edit content without touching code.

## Done log
<!-- append: - [YYYY-MM-DD] <what shipped> (commit <hash>) -->
