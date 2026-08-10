# RAQUEST — Erste Schritte (gamified onboarding)

Interactive, gamified course that walks a new designer/operator through the RAQUEST
mental model: login, the domain, the Standard Refund flow, master data, conflicts,
config, roles, and the UX findings.

- **Slide-deck navigation** — one chapter per page (12 chapters), keyboard-free, click to advance.
- **Bilingual** — English / Portuguese toggle (top-right).
- **Gamified** — XP, levels, a progress bar, and badges/trophies (via `canvas-confetti` + `framer-motion`).
- **Quizzes per chapter** — multiple choice, true/false, order-the-flow (the status chain), and vocabulary flashcards.

## Run it

```bash
cd raquest/aula-raquest-app
npm install
npm run dev      # opens http://localhost:3000
```

`npm run build` produces a static bundle in `build/`.

## Where the content comes from

`src/content.js` is generated from `../raquest-treino-erste-schritte.md`
(the two official Halvotec training videos, transcribed and summarized).
To edit the course, edit `content.js` — each chapter has `en` / `pt` bodies,
optional `cards` (flashcards) and a `quiz` array.

## Structure

```
src/
  index.js          entry
  App.jsx           state: language, XP, badges, chapter routing
  content.js        all 12 chapters (EN + PT) + quizzes + flashcards + badges
  styles.css        RAQUEST navy/blue theme
  components/
    Chrome.jsx      top bar (progress, XP, level) + dots
    ChapterVideo.jsx real training video (Bunny Stream or local) + segment chips
    ChapterDeck.jsx  one-idea-per-screen slides: explain → flash → quiz → complete
    LevelUpOverlay.jsx full-screen "LEVEL UP!" moment
    Certificate.jsx completion certificate (print)
    DevControls.jsx  floating prototype controls (dev only)
```
