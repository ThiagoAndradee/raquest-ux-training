import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { chapters, badges, UI, meta } from "./content";
import ChapterVideo from "./components/ChapterVideo";
import ChapterDeck from "./components/ChapterDeck";
import LevelUpOverlay from "./components/LevelUpOverlay";
import Certificate from "./components/Certificate";
import DevControls from "./components/DevControls";
import Tax101 from "./tax101/Tax101";
import Karaoke from "./components/Karaoke";
import "./components/karaoke.css";
import { TopBar, Dots } from "./components/Chrome";

const XP_PER_CHAPTER = 20;
const XP_PER_QUIZ = 15;
const XP_PER_CARD_SET = 10;
const LEVEL_STEP = 60; // xp per level

function fireConfetti() {
  confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ["#4a90d9", "#3fb6c8", "#e6b23c", "#3fae6b"] });
}

export default function App() {
  const [lang, setLang] = useState("en");
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [xp, setXp] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [finished, setFinished] = useState(false);
  // track which reward blocks were already granted, to avoid double-award
  const [, setGranted] = useState({}); // key -> true
  const [activeSeg, setActiveSeg] = useState(0); // which segment of the current chapter is shown in the top player
  const [name, setName] = useState(""); // learner's name, for the certificate
  const [email, setEmail] = useState(""); // learner's email — training summary is sent here
  const [quizAnswers, setQuizAnswers] = useState([]); // [{chapter, question, chosen, correctAnswer, correct}]
  const [emailStatus, setEmailStatus] = useState(null); // null | "sending" | "sent" | "error"
  const emailSentRef = useRef(false); // guard: send the summary only once per finish
  const [unlocked, setUnlocked] = useState(true); // content always available — no video gate
  const [levelUp, setLevelUp] = useState(null); // new level when crossing a boundary
  const [briefed, setBriefed] = useState(false); // intro slide shown once before chapter 1
  const [mode, setMode] = useState(null); // null = start screen, "course" = Erste Schritte, "tax101" = explainer

  const t = UI[lang];
  const total = chapters.length;
  const ch = chapters[idx];
  const level = Math.floor(xp / LEVEL_STEP) + 1;
  const levelProgress = ((xp % LEVEL_STEP) / LEVEL_STEP) * 100;

  // reset to the first segment whenever the chapter changes (content stays unlocked — no video gate)
  useEffect(() => {
    setActiveSeg(0);
    setUnlocked(true);
  }, [idx]);

  // detect level-up: when `level` increases, fire the overlay
  const prevLevel = useRef(level);
  useEffect(() => {
    if (level > prevLevel.current) {
      setLevelUp(level);
      fireConfetti();
    }
    prevLevel.current = level;
  }, [level]);

  const grantOnce = useCallback((key, amount) => {
    setGranted((g) => {
      if (g[key]) return g;
      setXp((x) => x + amount);
      return { ...g, [key]: true };
    });
  }, []);

  const awardBadge = useCallback((chapterIdx) => {
    const b = badges[chapterIdx];
    if (!b) return;
    setEarnedBadges((prev) => (prev.find((x) => x.icon === b.icon) ? prev : [...prev, b]));
  }, []);

  const go = useCallback(
    (n) => {
      const next = Math.max(0, Math.min(total, n));
      if (next >= total) {
        grantOnce(`chapter-${idx}`, XP_PER_CHAPTER);
        setFinished(true);
        fireConfetti();
        return;
      }
      // award current chapter completion xp on leaving forward
      if (n > idx) grantOnce(`chapter-${idx}`, XP_PER_CHAPTER);
      awardBadge(next);
      setIdx(next);
    },
    [idx, total, grantOnce, awardBadge]
  );

  const onQuizComplete = useCallback(() => grantOnce(`quiz-${idx}`, XP_PER_QUIZ), [idx, grantOnce]);
  const onCardsSeen = useCallback(() => grantOnce(`cards-${idx}`, XP_PER_CARD_SET), [idx, grantOnce]);

  // record a quiz answer for the end-of-training email summary
  const onQuizAnswer = useCallback((entry) => {
    setQuizAnswers((prev) => {
      const key = `${entry.chapterIdx}-${entry.questionIdx}`;
      const without = prev.filter((a) => a.key !== key);
      return [...without, { ...entry, key }];
    });
  }, []);

  // send the training summary by email when the course finishes
  const sendResults = useCallback(async () => {
    if (emailSentRef.current) return;
    if (!email || !/.+@.+\..+/.test(email)) { setEmailStatus("error"); return; }
    emailSentRef.current = true;
    setEmailStatus("sending");
    try {
      const res = await fetch("/api/send-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, lang,
          course: "RAQUEST — Erste Schritte",
          xp, level,
          badges: earnedBadges.map((b) => ({ icon: b.icon, label: b[lang] })),
          answers: quizAnswers.map((a) => ({
            chapter: a.chapter,
            question: a.question,
            chosen: a.chosen,
            correctAnswer: a.correctAnswer,
            correct: a.correct,
          })),
        }),
      });
      setEmailStatus(res.ok ? "sent" : "error");
    } catch {
      setEmailStatus("error");
    }
  }, [email, name, lang, xp, level, earnedBadges, quizAnswers]);

  useEffect(() => {
    if (finished && mode === "course") sendResults();
  }, [finished, mode, sendResults]);


  const restart = () => {
    setStarted(false);
    setFinished(false);
    setIdx(0);
    setXp(0);
    setEarnedBadges([]);
    setGranted({});
    setQuizAnswers([]);
    setEmailStatus(null);
    emailSentRef.current = false;
  };

  // ---------- TAX 101 EXPLAINER (independent full-screen module) ----------
  if (mode === "tax101") {
    return <Tax101 initialLang={lang} name={name} onExit={() => setMode(null)} />;
  }

  // ---------- KARAOKE (independent full-screen module) ----------
  if (mode === "karaoke") {
    return <Karaoke initialLang={lang} onExit={() => setMode(null)} />;
  }

  // ---------- START SCREEN (name + email → start) ----------
  if (!started) {
    const canStart = name.trim() && /.+@.+\..+/.test(email.trim());
    return (
      <div className="app start-screen">
        <LangToggle lang={lang} setLang={setLang} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero"
        >
          <div className="hero-badge">RAQUEST</div>
          <h1>{meta[lang].title}</h1>
          <p className="hero-sub">{meta[lang].subtitle}</p>
          <div className="hero-stats">
            <span>📚 {total} {t.chapter.toLowerCase()}s</span>
            <span>🏆 {Object.keys(badges).length} badges</span>
            <span>🎮 XP &amp; quizzes</span>
            <span>🎓 certificate</span>
          </div>
          <div className="hero-name">
            <label className="hero-name-label" htmlFor="learner-name">{t.nameLabel}</label>
            <input
              id="learner-name"
              className="hero-name-input"
              type="text"
              value={name}
              maxLength={60}
              placeholder={t.namePlaceholder}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canStart) setStarted(true); }}
            />
            <label className="hero-name-label" htmlFor="learner-email">{t.emailLabel}</label>
            <input
              id="learner-email"
              className="hero-name-input"
              type="email"
              value={email}
              maxLength={120}
              placeholder={t.emailPlaceholder}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canStart) setStarted(true); }}
            />
            <p className="hero-email-hint">{t.emailHint}</p>
            <button
              className="btn primary big hero-start-btn"
              disabled={!canStart}
              onClick={() => setStarted(true)}
            >
              {t.start} →
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---------- COURSE SELECTION (after name + email) ----------
  if (started && !mode) {
    return (
      <div className="app start-screen">
        <LangToggle lang={lang} setLang={setLang} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero"
        >
          <div className="hero-badge">RAQUEST</div>
          <h1>{t.pickCourse}</h1>
          <div className="hero-courses">
            <button
              className="hero-track-card hero-track-card--primary"
              onClick={() => { setMode("course"); }}
              type="button"
            >
              <span className="hero-track-emoji">🎓</span>
              <span className="hero-track-text">
                <span className="hero-track-title">{t.courseErsteTitle}</span>
                <span className="hero-track-sub">{t.courseErsteSub}</span>
              </span>
              <span className="hero-track-go">▶</span>
            </button>
            <button
              className="hero-track-card"
              onClick={() => setMode("tax101")}
              type="button"
            >
              <span className="hero-track-emoji">💸</span>
              <span className="hero-track-text">
                <span className="hero-track-title">{t.courseTaxTitle}</span>
                <span className="hero-track-sub">{t.courseTaxSub}</span>
              </span>
              <span className="hero-track-go">▶</span>
            </button>
            <button
              className="hero-track-card"
              onClick={() => setMode("karaoke")}
              type="button"
            >
              <span className="hero-track-emoji">🎤</span>
              <span className="hero-track-text">
                <span className="hero-track-title">Karaoke</span>
                <span className="hero-track-sub">Cante as músicas do WHT com a letra sincronizada</span>
              </span>
              <span className="hero-track-go">▶</span>
            </button>
          </div>
          <button className="btn ghost" onClick={() => setStarted(false)}>← {t.nameLabel}</button>
        </motion.div>
      </div>
    );
  }

  // ---------- BRIEFING SCREEN (intro before chapter 1) ----------
  if (mode === "course" && !briefed) {
    return (
      <div className="app start-screen">
        <LangToggle lang={lang} setLang={setLang} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero briefing"
        >
          <div className="hero-badge">RAQUEST</div>
          <h1>{t.briefingTitle}</h1>
          <p className="hero-sub">{t.briefingSub}</p>

          <div className="briefing-intro">
            <div className="briefing-intro-head"><span className="briefing-intro-ico">🏦</span><span className="briefing-intro-title">{t.briefingIntroTitle}</span></div>
            <p className="briefing-intro-body" dangerouslySetInnerHTML={{ __html: t.briefingIntroBody }} />
          </div>

          <div className="briefing-block">
            <div className="briefing-row">
              <span className="briefing-ico">🌐</span>
              <div className="briefing-text">
                <a className="briefing-link" href="https://appdemo7.halvotec.de/raquest-demo103/" target="_blank" rel="noreferrer">
                  {t.briefingOpenDemo} →
                </a>
                <div className="briefing-url">appdemo7.halvotec.de/raquest-demo103</div>
                <div className="briefing-hint">{t.briefingOpenHint}</div>
              </div>
            </div>

            <div className="briefing-creds">
              <span className="briefing-label">{t.briefingCreds}</span>
              <div className="cred-chips">
                <span className="cred-chip"><b>login</b> sv2</span>
                <span className="cred-chip"><b>senha</b> halvotec</span>
              </div>
            </div>
          </div>

          <div className="briefing-points">
            <div className="briefing-point"><span>🎮</span><span>{t.briefingEarn}</span></div>
            <div className="briefing-point"><span>⏱️</span><span>{t.briefingPace}</span></div>
          </div>

          <button className="btn primary big" onClick={() => { setBriefed(true); awardBadge(0); }}>
            {t.briefingStart}
          </button>
        </motion.div>
      </div>
    );
  }

  // ---------- FINISH SCREEN ----------
  if (finished) {
    return (
      <div className="app finish-screen">
        <LangToggle lang={lang} setLang={setLang} />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="hero">
          <div className="trophy">🏆</div>
          <h1>{t.done}</h1>
          <p className="hero-sub">{t.doneSub}</p>
          <div className="score-card">
            <div className="score-big">{xp} <span>{t.xp}</span></div>
            <div className="score-lvl">{t.level} {level}</div>
            {quizAnswers.length > 0 && (
              <div className="score-quiz">
                {t.quizScore}: {quizAnswers.filter((a) => a.correct).length}/{quizAnswers.length}
              </div>
            )}
          </div>
          <div className="badge-wall">
            <div className="badge-wall-title">{t.badgesEarned}</div>
            <div className="badge-row">
              {earnedBadges.map((b) => (
                <div className="badge-chip" key={b.icon}><span>{b.icon}</span>{b[lang]}</div>
              ))}
            </div>
          </div>
          <Certificate name={name} lang={lang} xp={xp} level={level} badges={earnedBadges} t={t} meta={meta} />
          <div className="results-email-status">
            {emailStatus === "sending" && <span className="res-status res-status--sending">✦ {t.sendingResults}</span>}
            {emailStatus === "sent" && <span className="res-status res-status--sent">✓ {t.resultsSent.replace("{email}", email)}</span>}
            {emailStatus === "error" && <span className="res-status res-status--error">{t.resultsError}</span>}
          </div>
          <button className="btn ghost" onClick={restart}>↻ {t.restart}</button>
        </motion.div>
      </div>
    );
  }

  // ---------- CHAPTER SCREEN ----------
  return (
    <div className="app">
      <TopBar
        t={t}
        lang={lang}
        setLang={setLang}
        idx={idx}
        total={total}
        xp={xp}
        level={level}
        levelProgress={levelProgress}
      />

      <div className="stage">
        <AnimatePresence mode="wait">
          <motion.section
            key={idx}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.28 }}
            className="chapter"
          >
            <div className="ch-head">
              <span className="ch-icon">{ch.icon}</span>
              <div>
                <div className="ch-eyebrow">{t.chapter} {idx + 1} {t.of} {total}</div>
                <h2>{ch[lang].title}</h2>
              </div>
            </div>

            {ch.video && ch.video.length > 0 && (
              <div className="ch-stage">
                <ChapterVideo
                  video={ch.video}
                  lang={lang}
                  chapterIdx={idx}
                  activeSeg={activeSeg}
                  setActiveSeg={setActiveSeg}
                  paused={false}
                />
                <div className="ch-deck-below">
                  <ChapterDeck
                    chapter={ch}
                    lang={lang}
                    t={t}
                    idx={idx}
                    allChapters={chapters}
                    onAward={grantOnce}
                    onCardsSeen={onCardsSeen}
                    onQuizComplete={onQuizComplete}
                    onQuizAnswer={onQuizAnswer}
                    onFinish={() => go(idx + 1)}
                  />
                </div>
                <div className="ch-nav">
                  <button
                    type="button"
                    className="ch-nav-btn"
                    onClick={() => go(idx - 1)}
                    disabled={idx === 0}
                  >
                    ‹ {t.prev || "Previous"}
                  </button>
                  <span className="ch-nav-count">{idx + 1} / {total}</span>
                  <button
                    type="button"
                    className="ch-nav-btn ch-nav-btn--next"
                    onClick={() => go(idx + 1)}
                    disabled={idx >= total - 1}
                  >
                    {t.next || "Next"} ›
                  </button>
                </div>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      <Dots total={total} idx={idx} />

      {levelUp && (
        <LevelUpOverlay level={levelUp} t={t} onClose={() => setLevelUp(null)} />
      )}

      <DevControls
        unlocked={unlocked}
        onNext={() => go(idx + 1)}
        onPrev={() => go(idx - 1)}
        idx={idx}
        total={total}
      />
    </div>
  );
}

function LangToggle({ lang, setLang }) {
  return (
    <div className="lang-toggle">
      <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
      <button className={lang === "pt" ? "on" : ""} onClick={() => setLang("pt")}>PT</button>
    </div>
  );
}
