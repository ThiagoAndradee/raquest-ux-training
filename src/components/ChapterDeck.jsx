import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

// One concept per full-screen slide. Order: explain -> flash -> quiz -> chapter-complete.
// Guidance over Free Exploration: a single idea, a single next action, always "on track".
export default function ChapterDeck({
  chapter,
  lang,
  t,
  idx,
  allChapters,
  onAward,
  onCardsSeen,
  onQuizComplete,
  onQuizAnswer,
  onFinish,
}) {
  const deck = useMemo(() => buildDeck(chapter, lang, allChapters, idx), [chapter, lang, allChapters, idx]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState({});
  const [answered, setAnswered] = useState({});
  // per-card self-assessment ratings, persisted so hard cards resurface across chapters
  const [ratings, setRatings] = useState(() => loadRatings());
  const rateCard = (term, rating) => {
    setRatings((r) => {
      const next = { ...r, [term]: { rating, chapter: idx, ts: Date.now() } };
      saveRatings(next);
      return next;
    });
  };

  const slide = deck[i];
  const isLast = i === deck.length - 1;
  const progress = ((i + 1) / deck.length) * 100;

  const canAdvance = (() => {
    if (!slide) return false;
    if (slide.type === "flash") return !!flipped[i] && !!ratings[slide.card.term];
    if (slide.type === "quiz") return answered[i] != null;
    return true;
  })();

  const next = () => {
    if (!canAdvance) return;
    if (slide.type === "explain") onAward(`explain-${idx}-${slide.pointK}`, 5);
    if (isLast) {
      onFinish();
      return;
    }
    setI((n) => Math.min(deck.length - 1, n + 1));
  };
  const back = () => setI((n) => Math.max(0, n - 1));

  // keyboard navigation: →/Enter advances (when allowed), ←/Backspace goes back
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || "";
      // don't hijack typing in inputs/textareas; let focused buttons handle their own Enter/Space
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(tag)) return;
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        if (canAdvance) next();
      } else if (e.key === "ArrowLeft" || e.key === "Backspace") {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAdvance, isLast, slide, idx]);

  useEffect(() => {
    if (slide && slide.type === "flash" && flipped[i]) {
      const lastFlash = [...deck.keys()].reverse().find((k) => deck[k].type === "flash");
      if (lastFlash === i) onCardsSeen && onCardsSeen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, i]);

  useEffect(() => {
    if (slide && slide.type === "quiz" && answered[i] != null) {
      const lastQuiz = [...deck.keys()].reverse().find((k) => deck[k].type === "quiz");
      if (lastQuiz === i) onQuizComplete && onQuizComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, i]);

  return (
    <div className="deck">
      <div className="deck-progress">
        <div className="deck-progress-track">
          <motion.div className="deck-progress-fill" animate={{ width: `${progress}%` }} />
        </div>
        <span className="deck-progress-label">{i + 1} / {deck.length}</span>
      </div>

      <div className="deck-stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 60, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -60, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="deck-slide"
          >
            {slide.type === "explain" && (
              <ExplainSlide slide={slide} t={t} total={deck.filter((s) => s.type === "explain").length} />
            )}
            {slide.type === "flash-intro" && (
              <FlashIntroSlide t={t} />
            )}
            {slide.type === "flash" && (
              <FlashSlide
                slide={slide}
                lang={lang}
                flipped={!!flipped[i]}
                onFlip={() => setFlipped((f) => ({ ...f, [i]: true }))}
                t={t}
                rating={ratings[slide.card.term]?.rating}
                onRate={rateCard}
                review={slide.review}
              />
            )}
            {slide.type === "quiz" && (
              <QuizSlide
                slide={slide}
                lang={lang}
                t={t}
                answered={answered[i]}
                onAnswer={(rec) => {
                  // choice / true-false: rec = { chosenIndex }
                  // order: rec = { ok, chosen[], correctOrder[], question }
                  if (rec.chosenIndex != null) {
                    const item = slide.item;
                    const data = item[lang];
                    const isTF = item.type === "tf";
                    const options = isTF ? [t.true, t.false] : data.options;
                    const correctIndex = isTF ? (data.answer ? 0 : 1) : data.answer;
                    const correct = rec.chosenIndex === correctIndex;
                    setAnswered((a) => ({ ...a, [i]: rec.chosenIndex }));
                    if (correct) confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
                    onQuizAnswer && onQuizAnswer({
                      chapterIdx: idx,
                      questionIdx: i,
                      chapter: (chapter[lang] && chapter[lang].title) || `Chapter ${idx + 1}`,
                      question: data.q,
                      chosen: options[rec.chosenIndex],
                      correctAnswer: options[correctIndex],
                      correct,
                    });
                  } else {
                    const correct = !!rec.ok;
                    setAnswered((a) => ({ ...a, [i]: correct }));
                    if (correct) confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
                    onQuizAnswer && onQuizAnswer({
                      chapterIdx: idx,
                      questionIdx: i,
                      chapter: (chapter[lang] && chapter[lang].title) || `Chapter ${idx + 1}`,
                      question: rec.question,
                      chosen: (rec.chosen || []).join(" → "),
                      correctAnswer: (rec.correctOrder || []).join(" → "),
                      correct,
                    });
                  }
                }}
              />
            )}
            {slide.type === "complete" && (
              <CompleteSlide slide={slide} t={t} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="deck-nav">
        <button className="btn ghost" disabled={i === 0} onClick={back}>
          ‹ {t.back}
        </button>
        {!canAdvance && slide && (slide.type === "flash" || slide.type === "quiz") && (
          <span className="deck-hint">
            {slide.type === "flash" ? t.flip : t.checkAnswer}
          </span>
        )}
        {canAdvance && (
          <span className="deck-hint deck-keys" aria-hidden="true">← →</span>
        )}
        <button className="btn primary" disabled={!canAdvance} onClick={next}>
          {isLast ? `${t.finishChapter} →` : `${t.next} ›`}
        </button>
      </div>
    </div>
  );
}

// ---------- deck builder ----------
// Splits long point paragraphs into shorter per-sentence explain slides so each
// screen carries one digestible idea instead of a dense wall of text.
function splitPoint(html) {
  if (!html) return [html];
  // a table is one unit — never split mid-cell (would break the markup)
  if (/<table[\s>]/.test(html)) return [html];
  const ABBR = ["ex.", "e.g.", "ca.", "vs.", "etc.", "z.B.", "bzw.", "Nr.", "u.a.", "o.g."];
  let work = html;
  const stash = [];
  ABBR.forEach((ab) => {
    const re = new RegExp("\\b" + ab.replace(/\./g, "\\.") + "(?=\\s)", "g");
    work = work.replace(re, (m) => { const id = stash.length; stash.push(m); return `§§${id}§§`; });
  });
  let parts = work.split(/(?<=\.)\s+(?=[A-ZÀ-ÿ<])/);
  parts = parts.map((p) => p.replace(/§§(\d+)§§/g, (m, k) => stash[Number(k)] || m));
  const chunks = [];
  for (const p of parts) {
    const s = p.trim();
    if (!s) continue;
    if (chunks.length && s.length < 45) chunks[chunks.length - 1] += " " + s;
    else chunks.push(s);
  }
  return chunks.length ? chunks : [html];
}

const RATINGS_KEY = "raquest_flash_ratings";
const INTRO_KEY = "raquest_flash_intro_seen";
function loadRatings() {
  try { return JSON.parse(localStorage.getItem(RATINGS_KEY) || "{}"); } catch { return {}; }
}
function saveRatings(r) {
  try { localStorage.setItem(RATINGS_KEY, JSON.stringify(r)); } catch {}
}

function buildDeck(chapter, lang, allChapters, idx) {
  const d = [];
  let explainN = 0;
  chapter[lang].points.forEach((html, k) => {
    const chunks = splitPoint(html);
    chunks.forEach((chunk) => {
      explainN += 1;
      d.push({ type: "explain", html: chunk, icon: chapter.icon, n: explainN, pointK: k });
    });
  });
  // one-time flashcard method intro (shown only on the first chapter that has cards)
  const hasCards = !!(chapter.cards && chapter.cards.length);
  if (hasCards && !localStorage.getItem(INTRO_KEY)) {
    d.push({ type: "flash-intro" });
  }
  // review queue: cards from OTHER chapters the learner rated hard/forgot — resurface them
  if (allChapters && idx != null) {
    const r = loadRatings();
    allChapters.forEach((ch, k) => {
      if (k === idx || !ch.cards) return;
      ch.cards.forEach((card) => {
        const rt = r[card.term];
        if (rt && (rt.rating === "hard" || rt.rating === "forgot")) {
          d.push({ type: "flash", card, review: true, fromChapter: k });
        }
      });
    });
  }
  (chapter.cards || []).forEach((card) => d.push({ type: "flash", card }));
  (chapter.quiz || []).forEach((item) => d.push({ type: "quiz", item }));
  d.push({ type: "complete" });
  return d;
}

// ---------- explain slide ----------
function ExplainSlide({ slide, t, total }) {
  return (
    <div className="slide explain">
      <div className="slide-eyebrow">
        <span className="slide-icon">{slide.icon}</span>
        <span>{(t && t.keyIdea) || "Key idea"} · {slide.n}{total ? ` / ${total}` : ""}</span>
      </div>
      <div className="slide-body" dangerouslySetInnerHTML={{ __html: slide.html }} />
      <div className="slide-image-slot" aria-hidden="true" />
    </div>
  );
}

// ---------- flash intro slide (how the flashcards work) ----------
function FlashIntroSlide({ t }) {
  useEffect(() => {
    try { localStorage.setItem(INTRO_KEY, "1"); } catch {}
  }, []);
  return (
    <div className="slide flash-intro">
      <div className="slide-eyebrow">
        <span className="slide-icon">📇</span>
        <span>{t.flashIntroTitle}</span>
      </div>
      <p className="flash-intro-body" dangerouslySetInnerHTML={{ __html: t.flashIntroBody }} />
    </div>
  );
}

// ---------- flash slide ----------
function FlashSlide({ slide, lang, flipped, onFlip, t, rating, onRate, review }) {
  const c = slide.card;
  return (
    <div className="slide flash">
      <div className="slide-eyebrow">
        <span className="slide-icon">📇</span>
        <span>{review ? `${t.flashReviewBadge} · ${t.flashTitle}` : t.flashTitle}</span>
      </div>
      <button
        className={`flash-big ${flipped ? "flipped" : ""}`}
        onClick={onFlip}
        disabled={flipped}
      >
        <div className="flash-big-inner">
          <div className="flash-big-front">
            <span className="flash-big-term">{c.term}</span>
            <span className="flash-big-hint">{t.tapReveal}</span>
          </div>
          <div className="flash-big-back">{c[lang]}</div>
        </div>
      </button>
      {flipped && (
        <motion.div
          className="flash-rate"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <span className="flash-rate-q">{t.flashRateQ}</span>
          <div className="flash-rate-btns">
            <button
              className={`flash-rate-btn easy ${rating === "easy" ? "on" : ""}`}
              onClick={() => onRate(c.term, "easy")}
            >{t.flashRateEasy}</button>
            <button
              className={`flash-rate-btn hard ${rating === "hard" ? "on" : ""}`}
              onClick={() => onRate(c.term, "hard")}
            >{t.flashRateHard}</button>
            <button
              className={`flash-rate-btn forgot ${rating === "forgot" ? "on" : ""}`}
              onClick={() => onRate(c.term, "forgot")}
            >{t.flashRateForgot}</button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ---------- quiz slide ----------
function QuizSlide({ slide, lang, t, answered, onAnswer }) {
  const item = slide.item;
  const isTF = item.type === "tf";
  const isOrder = item.type === "order";
  if (isOrder) {
    return <OrderSlide item={item} lang={lang} t={t} answered={answered} onAnswer={onAnswer} />;
  }
  const data = item[lang];
  const options = isTF ? [t.true, t.false] : data.options;
  const correctIndex = isTF ? (data.answer ? 0 : 1) : data.answer;
  const locked = answered != null;
  const chosenIndex = typeof answered === "number" ? answered : null;
  return (
    <div className="slide quiz">
      <div className="slide-eyebrow">
        <span className="slide-icon">🧠</span>
        <span>{t.quizTitle}</span>
      </div>
      <div className="slide-q">{data.q}</div>
      <div className={`slide-opts ${isTF ? "tf" : ""}`}>
        {options.map((opt, k) => {
          let cls = "slide-opt";
          if (locked) {
            if (k === correctIndex) cls += " correct";
            else if (k === chosenIndex) cls += " picked-wrong";
            else cls += " dimmed";
          }
          return (
            <button
              key={k}
              className={cls}
              disabled={locked}
              onClick={() => onAnswer({ chosenIndex: k })}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {locked && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`slide-feedback ${chosenIndex === correctIndex ? "ok" : "no"}`}
        >
          {chosenIndex === correctIndex ? `✓ ${t.correct}` : `✗ ${t.wrong}`}
        </motion.div>
      )}
      {locked && data.why && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="slide-why"
        >
          <span className="slide-why-label">💡 {t.whyLabel}</span>
          <span className="slide-why-text">{data.why}</span>
        </motion.div>
      )}
    </div>
  );
}

// ---------- order slide ----------
function OrderSlide({ item, lang, t, answered, onAnswer }) {
  const data = item[lang];
  const correctOrder = data.items;
  const [pool, setPool] = useState(() => shuffle(correctOrder.map((label, id) => ({ label, id }))));
  const [chosen, setChosen] = useState([]);
  const [result, setResult] = useState(null);

  const pick = (it) => {
    if (result !== null) return;
    setChosen((c) => [...c, it]);
    setPool((p) => p.filter((x) => x.id !== it.id));
  };
  const undo = (it) => {
    if (result !== null) return;
    setChosen((c) => c.filter((x) => x.id !== it.id));
    setPool((p) => [...p, it]);
  };
  const check = () => {
    const ok = chosen.every((c, k) => correctOrder[k] === c.label);
    setResult(ok);
    onAnswer({ ok, chosen: chosen.map((c) => c.label), correctOrder, question: data.q });
  };

  return (
    <div className="slide quiz">
      <div className="slide-eyebrow">
        <span className="slide-icon">🔢</span>
        <span>{t.orderTitle}</span>
      </div>
      <div className="slide-q">🔢 {data.q}</div>
      <div className="order-slots">
        {chosen.map((c, k) => (
          <button key={c.id} className="order-chip chosen" onClick={() => undo(c)}>
            <span className="order-n">{k + 1}</span>{c.label}
          </button>
        ))}
        {chosen.length === 0 && <div className="order-hint">{t.orderTitle}</div>}
      </div>
      {pool.length > 0 && (
        <div className="order-pool">
          {pool.map((p) => (
            <button key={p.id} className="order-chip" onClick={() => pick(p)}>{p.label}</button>
          ))}
        </div>
      )}
      {pool.length === 0 && result === null && (
        <button className="btn primary small" onClick={check}>{t.submitOrder}</button>
      )}
      {result !== null && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`slide-feedback ${result ? "ok" : "no"}`}>
          {result ? `✓ ${t.correct}` : `✗ ${t.wrong}`}
        </motion.div>
      )}
      {result !== null && data.why && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="slide-why"
        >
          <span className="slide-why-label">💡 {t.whyLabel}</span>
          <span className="slide-why-text">{data.why}</span>
        </motion.div>
      )}
      {result === false && (
        <button
          className="btn ghost small"
          onClick={() => {
            setPool(shuffle(correctOrder.map((label, id) => ({ label, id }))));
            setChosen([]);
            setResult(null);
          }}
        >
          ↻
        </button>
      )}
    </div>
  );
}

// ---------- complete slide ----------
function CompleteSlide({ slide, t }) {
  return (
    <div className="slide complete">
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }}
        className="complete-trophy"
      >
        🎉
      </motion.div>
      <h2 className="complete-title">{t.chapterDone}</h2>
      <p className="complete-sub">{t.chapterDoneSub}</p>
    </div>
  );
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
