import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { scenes, TAX_UI, KEY_INSIGHTS, EXAMPLES } from "./tax-content";
import LYRICS_TIMING from "./lyrics-timing.json";
import "./tax101.css";

// varied per-scene entrance transitions (cycles so each slide feels different)
const SCENE_TRANS = [
  { initial: { opacity: 0, x: 44 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -44 } },
  { initial: { opacity: 0, y: 34 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -34 } },
  { initial: { opacity: 0, scale: 0.94 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.06 } },
  { initial: { opacity: 0, rotate: -1.4, x: -30 }, animate: { opacity: 1, rotate: 0, x: 0 }, exit: { opacity: 0, rotate: 1.4, x: 30 } },
];

// unlockable badges (quiz)
const BADGES = [
  { id: "first", ico: "🎯", name: { en: "First Steps", pt: "Primeiros Passos" }, desc: { en: "Answered your first question.", pt: "Respondeu a primeira pergunta." }, check: ({ score, total }) => score + (total - score) > 0 },
  { id: "fire", ico: "🔥", name: { en: "On Fire", pt: "Pegando Fogo" }, desc: { en: "Reached a 3-question streak.", pt: "Acertou 3 seguidas." }, check: ({ best }) => best >= 3 },
  { id: "unstoppable", ico: "⚡", name: { en: "Unstoppable", pt: "Imparável" }, desc: { en: "Reached a 5-question streak.", pt: "Acertou 5 seguidas." }, check: ({ best }) => best >= 5 },
  { id: "sharp", ico: "🗡️", name: { en: "Sharp", pt: "Afiado" }, desc: { en: "Reached a 7-question streak.", pt: "Acertou 7 seguidas." }, check: ({ best }) => best >= 7 },
  { id: "perfect", ico: "💎", name: { en: "Perfect Run", pt: "Rodada Perfeita" }, desc: { en: "Every question correct.", pt: "Acertou todas." }, check: ({ score, total }) => total > 0 && score === total },
  { id: "scholar", ico: "🎓", name: { en: "Scholar", pt: "Estudante" }, desc: { en: "Scored at least half.", pt: "Acertou pelo menos a metade." }, check: ({ score, total }) => total > 0 && score >= Math.ceil(total / 2) },
];

// Animated "Tax Withholding — First Steps" explainer.
// Self-contained: render <Tax101 onExit={...} /> anywhere. Lottie characters load from
// public/lottie/<file>; if an asset is missing it falls back to an animated emoji so it always runs.

export default function Tax101({ onExit, name = "", initialLang = "en" }) {
  const [lang, setLang] = useState(initialLang);
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [finished, setFinished] = useState(false);
  const [nextLoad, setNextLoad] = useState(0);

  const t = TAX_UI[lang];
  const total = scenes.length;
  const s = scenes[i];

  const go = (n) => {
    const next = Math.max(0, Math.min(total, n));
    if (next >= total) {
      // completion bonus (+100 XP) — credited here, before the done screen renders, so the
      // certificate and achievements panel both read the final XP on first paint.
      try {
        if (!sessionStorage.getItem("tax101_xp_credited")) {
          const cur = parseInt(localStorage.getItem("tax101_xp") || "0", 10) || 0;
          localStorage.setItem("tax101_xp", String(cur + 100));
          sessionStorage.setItem("tax101_xp_credited", "1");
        }
      } catch {}
      setFinished(true);
      return;
    }
    setI(next);
  };

  // ---------- intro ----------
  if (!started) {
    return (
      <div className="tax101 intro">
        <LangToggle lang={lang} setLang={setLang} />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="tax-hero">
          <div className="tax-badge">RAQUEST · 101</div>
          <h1>{t.title}</h1>
          <p className="tax-sub">{t.subtitle}</p>
          <div className="tax-hero-art">💸➡️🌍➡️🏛️➡️💰</div>
          <button className="tax-btn primary" onClick={() => setStarted(true)}>{t.start} →</button>
          {onExit && <button className="tax-btn ghost" onClick={onExit}>✕</button>}
        </motion.div>
      </div>
    );
  }

  // ---------- done ----------
  if (finished) {
    return (
      <div className="tax101 intro">
        <LangToggle lang={lang} setLang={setLang} />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="tax-hero">
          <div className="tax-done-art">🏆</div>
          <h1>{t.done}</h1>
          <p className="tax-sub">{t.doneSub}</p>
          <Achievements lang={lang} />
          <ShareCard lang={lang} />
          <TaxCert name={name} lang={lang} t={t} />
          <div className="tax-hero-btns">
            <button className="tax-btn ghost" onClick={() => { setFinished(false); setI(0); setStarted(false); }}>↻ {t.restart}</button>
            {onExit && <button className="tax-btn primary" onClick={onExit}>✓</button>}
          </div>
        </motion.div>
      </div>
    );
  }

  // ---------- scene ----------
  return (
    <div className="tax101" style={{ "--accent": s.accent }}>
      <div className="tax-top">
        <span className="tax-count">{t.scene} {i + 1} {t.of} {total}</span>
        <div className="tax-dots">
          {scenes.map((_, k) => <span key={k} className={`tax-dot ${k === i ? "on" : ""} ${k < i ? "done" : ""}`} />)}
        </div>
        <LangToggle lang={lang} setLang={setLang} small />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          className="tax-stage"
          variants={SCENE_TRANS[i % SCENE_TRANS.length]}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.34, ease: "easeOut" }}
        >
          {s.kind === "journey" && <JourneyMap scene={s} lang={lang} t={t} />}
          {s.kind === "game" && (
            <FlowGame
              scene={s}
              lang={lang}
              t={t}
              onBack={() => go(i - 1)}
              onFinish={() => go(i + 1)}
            />
          )}
          {s.kind === "sortgame" && (
            <SortGame
              scene={s}
              lang={lang}
              t={t}
              onBack={() => go(i - 1)}
              onFinish={() => go(i + 1)}
            />
          )}
          {s.kind === "recap" && <Recap scene={s} lang={lang} t={t} />}
          {s.kind === "map" && <ModuleMap scene={s} lang={lang} t={t} />}
          {s.kind === "flash" && (
            <FlashDeck
              scene={s}
              lang={lang}
              t={t}
              onBack={() => go(i - 1)}
              onFinish={() => go(i + 1)}
            />
          )}
          {s.kind === "quiz" && (
            <QuizScene
              scene={s}
              lang={lang}
              t={t}
              onBack={() => go(i - 1)}
              onFinish={() => go(i + 1)}
            />
          )}
          {!s.kind && (
            <NarrSlide scene={s} lang={lang} t={t} current={i} go={go} onNextLoad={setNextLoad} />
          )}
        </motion.div>
      </AnimatePresence>

      {s.kind !== "flash" && s.kind !== "quiz" && (
        <div className="tax-nav">
          <button className="tax-btn ghost" disabled={i === 0} onClick={() => go(i - 1)}>‹ {t.back}</button>
          <button
            className={`tax-btn primary tax-next-auto ${nextLoad > 0 && nextLoad < 1 ? "loading" : ""}`}
            onClick={() => go(i + 1)}
            style={{ "--next-load": nextLoad }}
          >
            <span className="tax-next-fill" style={{ width: `${nextLoad * 100}%` }} />
            <span className="tax-next-label">{i === total - 1 ? t.done : t.next} ›</span>
          </button>
        </div>
      )}
    </div>
  );
}

function Character({ scene, progress = 0 }) {
  const iconName = FLOW_ICON[scene.fallback];
  const R = 40;
  const C = 2 * Math.PI * R;
  return (
    <motion.div
      className="tax-avatar"
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }}
      transition={{ opacity: { duration: 0.3 }, scale: { type: "spring", stiffness: 280, damping: 18 }, y: { duration: 3.4, repeat: Infinity, ease: "easeInOut" } }}
    >
      <span className="tax-avatar-glow" aria-hidden="true" />
      <span className="tax-avatar-ring" aria-hidden="true" />
      <span className="tax-avatar-ring ring2" aria-hidden="true" />
      <svg className="tax-avatar-progress" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" stroke="color-mix(in srgb,var(--accent) 18%,transparent)" strokeWidth="3" />
        <motion.circle
          cx="50" cy="50" r={R} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C - (C * progress) }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          transform="rotate(-90 50 50)"
          style={{ filter: "drop-shadow(0 0 6px color-mix(in srgb,var(--accent) 60%,transparent))" }}
        />
      </svg>
      <span className="tax-avatar-core">
        {iconName ? <Icon name={iconName} size={30} /> : <span className="tax-badge-emoji">{scene.fallback}</span>}
      </span>
    </motion.div>
  );
}

// ---------- narrative slide: avatar + animated headline + caption + hero flow ----------
function CountUp({ value }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf; const start = performance.now(); const from = n; const dur = 600;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      setN(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{n}</>;
}
// ---------- global achievements panel (done screen) ----------
function Achievements({ lang }) {
  const xp = (() => { try { return parseInt(localStorage.getItem("tax101_xp") || "0", 10) || 0; } catch { return 0; } })();
  const best = Number(localStorage.getItem("tax101_best_streak") || 0);
  const savedCount = (() => { try { return JSON.parse(localStorage.getItem("tax101_saved_terms") || "[]").length; } catch { return 0; } })();
  const level = Math.floor(xp / 100) + 1;
  const levelProgress = xp % 100;
  const badges = [
    { ico: "🎓", name: { en: "Course Complete", pt: "Curso Completo" }, on: true },
    { ico: "🔥", name: { en: "On Fire", pt: "Pegando Fogo" }, on: best >= 3 },
    { ico: "⚡", name: { en: "Unstoppable", pt: "Imparável" }, on: best >= 5 },
    { ico: "🗡️", name: { en: "Sharp", pt: "Afiado" }, on: best >= 7 },
    { ico: "🔖", name: { en: "Collector", pt: "Colecionador" }, on: savedCount >= 5 },
    { ico: "💎", name: { en: "Scholar", pt: "Estudante" }, on: xp >= 500 },
  ];
  return (
    <motion.div
      className="tax-ach"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
    >
      <div className="tax-ach-xp-row">
        <div className="tax-ach-xp-box">
          <span className="tax-ach-xp-num">{xp}</span>
          <span className="tax-ach-xp-lbl">XP</span>
        </div>
        <div className="tax-ach-level">
          <span className="tax-ach-level-name">{lang === "pt" ? "Nível" : "Level"} {level}</span>
          <div className="tax-ach-level-bar"><motion.div initial={{ width: 0 }} animate={{ width: `${levelProgress}%` }} transition={{ duration: 0.6 }} /></div>
          <span className="tax-ach-level-prog">{levelProgress}/100</span>
        </div>
      </div>
      <div className="tax-badges">
        {badges.map((b) => (
          <div key={b.ico} className={`tax-badge ${b.on ? "on" : "off"}`}>
            <span className="tax-badge-ico">{b.ico}</span>
            <span className="tax-badge-name">{b.name[lang]}</span>
            {!b.on && <span className="tax-badge-lock">🔒</span>}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ---------- certificate (done screen) ----------
function TaxCert({ name, lang, t }) {
  const certRef = useRef(null);
  const fmtDate = () => new Date().toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const xp = (() => { try { return parseInt(localStorage.getItem("tax101_xp") || "0", 10) || 0; } catch { return 0; } })();
  const level = Math.floor(xp / 100) + 1;
  const best = (() => { try { return parseInt(localStorage.getItem("tax101_best_streak") || "0", 10) || 0; } catch { return 0; } })();

  // unique certificate id (stable per name)
  const certId = React.useMemo(() => {
    const seed = (name || "anon") + "RAQUEST101";
    let h = 0; for (let c = 0; c < seed.length; c++) h = (h * 31 + seed.charCodeAt(c)) >>> 0;
    const a = (h & 0xffff).toString(16).padStart(4, "0");
    const b = ((h >> 16) & 0xffff).toString(16).padStart(4, "0");
    return `RA-${a}-${b}`.toUpperCase();
  }, [name]);

  // deterministic QR-like verification grid (decorative, derived from certId)
  const qr = React.useMemo(() => {
    let h = 0; for (let c = 0; c < certId.length; c++) h = (h * 1103515245 + 12345 + certId.charCodeAt(c)) >>> 0;
    const cells = [];
    for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
      const finder = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
      if (finder) { cells.push(true); continue; }
      h = (h * 1103515245 + 12345) >>> 0;
      cells.push((h & 1) === 1);
    }
    return cells;
  }, [certId]);
  const verifyUrl = `codecuriousdesigner.com/verify/${certId}`;

  const earned = [
    { ico: "🔥", on: best >= 3 },
    { ico: "⚡", on: best >= 5 },
    { ico: "🗡️", on: best >= 7 },
    { ico: "💎", on: xp >= 500 },
  ].filter((b) => b.on);

  const downloadPNG = () => {
    const node = certRef.current;
    if (!node) return;
    const w = node.offsetWidth, h = node.offsetHeight;
    const clone = node.cloneNode(true);
    // The SVG is rendered as a standalone image via a Blob URL, so it has NO access to the
    // page stylesheets. Inline the computed styles onto every cloned node so the PNG keeps
    // its colors/layout/gradients. (Pseudo-element ornaments are not captured — acceptable.)
    const inline = (src, dst) => {
      const cs = getComputedStyle(src);
      let css = "";
      for (let i = 0; i < cs.length; i++) {
        const prop = cs.item(i);
        css += `${prop}:${cs.getPropertyValue(prop)};`;
      }
      dst.style.cssText = css;
    };
    const walk = (src, dst) => {
      inline(src, dst);
      const sc = src.children, dc = dst.children;
      for (let i = 0; i < sc.length && i < dc.length; i++) walk(sc[i], dc[i]);
    };
    walk(node, clone);
    const data = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(clone)}</foreignObject></svg>`;
    const img = new Image();
    const svg = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svg);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w * 2; canvas.height = h * 2;
      const ctx = canvas.getContext("2d");
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `RAQUEST-certificado-${(name || "aluno").replace(/\s+/g, "-")}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  return (
    <div className="tax-cert-wrap">
      <div className="tax-cert" ref={certRef}>
        <div className="tax-cert-border">
          <span className="tax-cert-corner tl" />
          <span className="tax-cert-corner tr" />
          <span className="tax-cert-corner bl" />
          <span className="tax-cert-corner br" />
          <div className="tax-cert-guilloche" />

          <div className="tax-cert-head">
            <div className="tax-cert-seal">
              <div className="tax-cert-seal-inner">🎓</div>
              <span className="tax-cert-ribbon l" />
              <span className="tax-cert-ribbon r" />
            </div>
            <div className="tax-cert-brand">RAQUEST · 101</div>
            <div className="tax-cert-course">{t.certCourse}</div>
          </div>

          <h2 className="tax-cert-title">{t.certTitle}</h2>
          <p className="tax-cert-certifies">{t.certCertifies}</p>
          <div className="tax-cert-name">{name || "—"}</div>
          <p className="tax-cert-body">{t.certBody}</p>

          <div className="tax-cert-stats">
            <span className="tax-cert-stat">🎮 {xp} XP</span>
            <span className="tax-cert-stat">⭐ {lang === "pt" ? "Nível" : "Level"} {level}</span>
            <span className="tax-cert-stat">🔥 {best}x</span>
          </div>

          {earned.length > 0 && (
            <div className="tax-cert-badges">
              {earned.map((b, k) => <span key={k} className="tax-cert-badge">{b.ico}</span>)}
            </div>
          )}

          <div className="tax-cert-foot">
            <div className="tax-cert-date">
              <div className="tax-cert-date-label">{t.certIssued}</div>
              <div className="tax-cert-date-val">{fmtDate()}</div>
              <div className="tax-cert-id">{certId}</div>
            </div>
            <div className="tax-cert-verify">
              <div className="tax-cert-qr">
                {qr.map((on, k) => <span key={k} className={`tax-qr-cell ${on ? "on" : ""}`} />)}
              </div>
              <div className="tax-cert-verify-url">{verifyUrl}</div>
            </div>
            <div className="tax-cert-sign">
              <div className="tax-cert-sign-script">RAQUEST</div>
              <div className="tax-cert-sign-line" />
              <div className="tax-cert-sign-name">{t.certSignee}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="tax-cert-btns">
        <button className="tax-btn primary" onClick={() => window.print()}>🖨 {t.print}</button>
        <button className="tax-btn ghost" onClick={downloadPNG}>{t.download}</button>
      </div>
    </div>
  );
}

// ---------- share card (done screen) ----------
function ShareCard({ lang }) {
  const [copied, setCopied] = useState(false);
  const text = lang === "pt"
    ? "🏆 Completei o curso 'Imposto na Fonte — Primeiros Passos' do RAQUEST 101. Já sei como o imposto retido lá fora volta pra casa — Quellensteuer, DBA, RA-NR, MiKaDiv e tudo. #WHT #reclaim"
    : "🏆 I finished the 'Tax Withholding — First Steps' course on RAQUEST 101. Now I know how withheld tax abroad finds its way back — Quellensteuer, DBA, RA-NR, MiKaDiv and all. #WHT #reclaim";
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };
  const li = "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent("https://www.codecuriousdesigner.com") + "&summary=" + encodeURIComponent(text);
  return (
    <motion.div
      className="tax-share"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.4 }}
    >
      <span className="tax-share-title">{lang === "pt" ? "Compartilhar" : "Share"}</span>
      <button className="tax-btn tiny primary" onClick={copy}>{copied ? (lang === "pt" ? "✓ Copiado" : "✓ Copied") : (lang === "pt" ? "⧉ Copiar" : "⧉ Copy")}</button>
      <a className="tax-btn tiny ghost" href={li} target="_blank" rel="noreferrer">in LinkedIn</a>
    </motion.div>
  );
}

function NarrSlide({ scene, lang, t, current, go, onNextLoad }) {
  const d = scene[lang];
  const total = scenes.length;
  const words = (d.bubble || "").split(" ");
  const audioRef = useRef(null);

  return (
    <div className="tax-narr-slide">
      {/* replay narration — top */}
      <Narration id={scene.id} lang={lang} replayLabel={t.replay} audioRef={audioRef} />

      {/* animated backdrop glow */}
      <motion.div
        className="tax-narr-glow"
        aria-hidden="true"
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* floating accent orbs for extra illustration */}
      <motion.span className="tax-orb orb1" aria-hidden="true"
        animate={{ y: [0, -14, 0], x: [0, 6, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }} />
      <motion.span className="tax-orb orb2" aria-hidden="true"
        animate={{ y: [0, 12, 0], x: [0, -8, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} />
      <motion.span className="tax-orb orb3" aria-hidden="true"
        animate={{ y: [0, -10, 0], opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 6.3, repeat: Infinity, ease: "easeInOut" }} />

      {/* floating thematic mini-icons derived from this scene's flow */}
      {d.flow && (d.flow.nodes || []).slice(0, 4).map((n, k) => {
        const ic = FLOW_ICON[n.icon];
        const pos = ["8%","18%","26%","14%"][k] || "10%";
        const side = k % 2 ? "right" : "left";
        return (
          <motion.span
            key={k}
            className={`tax-float-ico fi${k}`}
            style={side === "left" ? { left: pos } : { right: pos }}
            aria-hidden="true"
            animate={{ y: [0, k % 2 ? 14 : -14, 0], opacity: [0.35, 0.75, 0.35] }}
            transition={{ duration: 5 + k, repeat: Infinity, ease: "easeInOut", delay: k * 0.4 }}
          >
            {ic ? <Icon name={ic} size={20} /> : <span className="tax-float-emoji">{n.icon}</span>}
          </motion.span>
        );
      })}

      {/* topic chip + XP counter */}
      <div className="tax-top-row">
        <motion.div
          className="tax-topic-chip"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className="tax-topic-chip-num">{scene.id}</span>
          <span className="tax-topic-chip-dot" />
          <span className="tax-topic-chip-label">{d.flow && (d.flow.nodes || []).length ? (d.flow.nodes[d.flow.nodes.length - 1].label) : "RAQUEST"}</span>
        </motion.div>
        <motion.div
          className="tax-xp"
          initial={{ opacity: 0, scale: 0.6, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
        >
          <span className="tax-xp-ico">⚡</span>
          <span className="tax-xp-num"><CountUp value={scene.id * 10} /></span>
          <span className="tax-xp-lbl">XP</span>
        </motion.div>
      </div>

      {/* level-up checkpoint every 3 scenes */}
      <AnimatePresence>
        {scene.id % 3 === 0 && (
          <motion.div
            key={`lvl-${scene.id}`}
            className="tax-levelup"
            initial={{ opacity: 0, scale: 0.5, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.25 }}
          >
            <span className="tax-levelup-badge">LEVEL {Math.floor(scene.id / 3)}</span>
            <span className="tax-levelup-txt">{lang === "pt" ? "Checkpoint desbloqueado!" : "Checkpoint unlocked!"}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* big step number in the corner */}
      <motion.div
        className="tax-bignum"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.1 }}
        aria-hidden="true"
      >
        <span className="tax-bignum-n">{String(scene.id).padStart(2, "0")}</span>
        <span className="tax-bignum-sep">/</span>
        <span className="tax-bignum-tot">{String(total).padStart(2, "0")}</span>
      </motion.div>

      {/* animated progress bar */}
      <div className="tax-progress-wrap">
        <div className="tax-progress" aria-hidden="true">
          <motion.div
            className="tax-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${(scene.id / total) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <span className="tax-progress-rem">
          {total - scene.id > 0
            ? (lang === "pt" ? `${total - scene.id} restantes` : `${total - scene.id} left`)
            : (lang === "pt" ? "última" : "last")}
        </span>
      </div>

      {/* two-column layout: left = avatar/headline/flow, right = big karaoke lyrics */}
      <div className="tax-narr-cols">
        <div className="tax-narr-left">
          {/* header row: avatar + headline */}
          <div className="tax-narr-head">
            <Character scene={scene} progress={scene.id / total} />
            <motion.h2
              className="tax-narr-title"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.045 } } }}
            >
              {words.map((w, k) => (
                <motion.span
                  key={k}
                  className="tax-narr-word"
                  variants={{ hidden: { opacity: 0, y: 12, filter: "blur(4px)" }, show: { opacity: 1, y: 0, filter: "blur(0)" } }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                >
                  {w}&nbsp;
                </motion.span>
              ))}
            </motion.h2>
          </div>

          {/* key insight callout (curated one-liner) */}
          {KEY_INSIGHTS[scene.id] && (
            <motion.div
              className="tax-insight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <span className="tax-insight-ico">💡</span>
              <span className="tax-insight-txt">{KEY_INSIGHTS[scene.id][lang]}</span>
            </motion.div>
          )}

      {/* concrete examples with numbers */}
      {EXAMPLES[scene.id] && EXAMPLES[scene.id][lang].map((ex, k) => (
        <motion.div
          key={k}
          className="tax-example"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 + k * 0.08, duration: 0.4 }}
        >
          <span className="tax-example-ico">{exampleIcon(ex)}</span>
          <span className="tax-example-txt" dangerouslySetInnerHTML={{ __html: highlightEuro(ex) }} />
        </motion.div>
      ))}

      {/* interactive calculator on the withholding scene */}
      {scene.id === 3 && <TaxCalc lang={lang} />}
      {/* fee calculator on the business-model scene */}
      {scene.id === 106 && <FeeCalc lang={lang} />}
        </div>

        {/* big karaoke-style lyrics on the right — global, all scenes */}
        <GlobalLyrics scenes={scenes} lang={lang} current={current} go={go} onNextLoad={onNextLoad} audioRef={audioRef} />
      </div>

      {/* hero flow diagram — full width, below the columns so nothing gets clipped */}
      {d.flow && (
        <div className="tax-narr-flow-wrap">
          {NARR_FLOW[scene.id] ? (
            <NarrFlow flow={d.flow} audioRef={audioRef} cfg={NARR_FLOW[scene.id]} lang={lang} />
          ) : (
            <FlowDiagram flow={d.flow} hero />
          )}
        </div>
      )}
      {/* scene 10 has no flow in content — NarrFlow provides its own */}
      {!d.flow && NARR_FLOW[scene.id] && (
        <div className="tax-narr-flow-wrap">
          <NarrFlow flow={null} audioRef={audioRef} cfg={NARR_FLOW[scene.id]} lang={lang} />
        </div>
      )}
    </div>
  );
}

// ---------- karaoke-style lyrics (big text, line-by-line highlight) ----------
function highlightEuro(text) {
  // escape then wrap €-amounts and percentages in a highlighted span
  const esc = (text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(/(€[\d.,]+|~?[\d.,]+%|\d+\s*(?:pp|months?|years?|meses|semanas?|semanas|anos))/g, (m) => `<b class="tax-ex-num">${m}</b>`);
}
function exampleIcon(text) {
  const t = (text || "").toLowerCase();
  if (/€|fee|refund|reembolso|dividend|lucro|profit/.test(t)) return "💰";
  if (/month|year|mes|ano|semana|deadline|prazo|wait|espera|warnfrist|ablauf/.test(t)) return "⏰";
  if (/form|druckprozess|wohn|doc|carta|letter|formulário|certificate/.test(t)) return "📄";
  if (/bank|banco|authority|autoridade|bzt|finanzamt|lagerstelle|clearstream/.test(t)) return "🏛️";
  if (/vollmacht|flag|sign|assina|procuração/.test(t)) return "🚩";
  if (/chain|cadeia|csd|custod|lagerstell/.test(t)) return "🔗";
  return "📋";
}

// ---------- global karaoke lyrics: all scenes, clickable, auto-advance ----------
function GlobalLyrics({ scenes, lang, current, go, onNextLoad, audioRef }) {
  // build all narrative segments with their lines.
  // Prefer real per-line timings from edge-tts subtitles (lyrics-timing.json) so the
  // karaoke text matches the spoken narration AND the active line tracks real audio
  // time. Fall back to 6-word chunks (linear time mapping) when no timing exists.
  const narr = React.useMemo(() => {
    const out = [];
    scenes.forEach((s, idx) => {
      const text = s[lang] && s[lang].narration;
      if (!text) return;
      const title = (s[lang].bubble || "").split(" ").slice(0, 4).join(" ");
      const timed = LYRICS_TIMING[String(s.id)] && LYRICS_TIMING[String(s.id)][lang];
      if (timed && timed.length) {
        out.push({ idx, id: s.id, title, timed: true, lines: timed });
      } else {
        const words = text.split(/\s+/).filter(Boolean);
        const lines = [];
        for (let i = 0; i < words.length; i += 6) lines.push({ line: words.slice(i, i + 6).join(" ") });
        out.push({ idx, id: s.id, title, timed: false, lines });
      }
    });
    return out;
  }, [scenes, lang]);

  const curSeg = narr.find((n) => n.idx === current) || null;
  const [activeLine, setActiveLine] = useState(0);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // reset when scene changes
  useEffect(() => {
    setActiveLine(0);
    setLoading(false);
    onNextLoad(0);
  }, [current]); // eslint-disable-line

  // sync active line to narration audio; fall back to a constant interval when no audio
  useEffect(() => {
    if (!curSeg) return;
    const last = curSeg.lines.length - 1;
    const a = audioRef ? audioRef.current : null;

    if (a) {
      const onTime = () => {
        if (curSeg.timed) {
          // real timings: find the last line whose start <= currentTime
          const t = a.currentTime;
          let lo = 0, hi = last;
          while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if ((curSeg.lines[mid].start ?? 0) <= t) lo = mid; else hi = mid - 1;
          }
          setActiveLine(lo);
        } else if (a.duration) {
          // fallback: linear mapping
          setActiveLine(Math.min(last, Math.floor((a.currentTime / a.duration) * (last + 1))));
        }
      };
      const onEnded = () => setActiveLine(last);
      a.addEventListener("timeupdate", onTime);
      a.addEventListener("ended", onEnded);
      return () => { a.removeEventListener("timeupdate", onTime); a.removeEventListener("ended", onEnded); };
    }

    // no audio → constant interval fallback
    const per = 2200;
    const id = setInterval(() => {
      setActiveLine((x) => {
        if (x < last) return x + 1;
        clearInterval(id);
        return x;
      });
    }, per);
    return () => clearInterval(id);
  }, [curSeg, current]); // eslint-disable-line

  // when the current segment's last line is reached, start the 2s auto-advance load
  useEffect(() => {
    if (!curSeg || loading) return;
    const last = curSeg.lines.length - 1;
    if (activeLine < last) return;
    setLoading(true);
    const start = Date.now();
    let raf;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / 2000);
      onNextLoad(p);
      if (p >= 1) { go(current + 1); }
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [curSeg, activeLine, loading, current]); // eslint-disable-line

  // keep active line centered
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !curSeg) return;
    const active = el.querySelector(".tax-lyric-line.on");
    if (active) {
      const top = active.offsetTop - el.clientHeight / 2 + active.clientHeight / 2;
      el.scrollTo({ top, behavior: "smooth" });
    }
  }, [activeLine, current, curSeg]);

  const jump = (n, lineIdx) => {
    if (n.idx === current) {
      setActiveLine(lineIdx);
      // if timed + audio, seek the audio to the line's start so the click is honored
      if (n.timed && audioRef && audioRef.current && n.lines[lineIdx].start != null) {
        try { audioRef.current.currentTime = n.lines[lineIdx].start; } catch {}
      }
    } else go(n.idx);
  };

  return (
    <div className="tax-lyrics tax-lyrics-global" aria-label={lang === "pt" ? "Narração" : "Narration"}>
      <div className="tax-lyrics-scroll" ref={scrollRef}>
        {narr.map((n) => {
          const isCur = n.idx === current;
          return (
            <div key={n.id} className={`tax-lyrics-seg ${isCur ? "cur" : ""}`}>
              <div
                className="tax-lyrics-seg-head"
                role="button"
                tabIndex={0}
                onClick={() => go(n.idx)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(n.idx); } }}
              >
                <span className="tax-lyrics-seg-num">{String(n.id).padStart(2, "0")}</span>
                <span className="tax-lyrics-seg-title">{n.title}</span>
              </div>
              {n.lines.map((ln, k) => {
                const active = isCur && k === activeLine;
                const past = isCur && k < activeLine;
                return (
                  <div
                    key={k}
                    className={`tax-lyric-line ${active ? "on" : ""} ${past ? "past" : ""}`}
                    style={{ opacity: active ? 1 : isCur ? (past ? 0.4 : 0.2) : 0.13 }}
                    role="button"
                    tabIndex={0}
                    onClick={() => jump(n, k)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); jump(n, k); } }}
                  >
                    {ln.line}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- interactive withholding calculator (scene 3) ----------
const COUNTRIES = {
  CH: { en: "Switzerland 🇨🇭", pt: "Suíça 🇨🇭", rate: 0.35, cap: 0.15, deadline: "36m" },
  FR: { en: "France 🇫🇷", pt: "França 🇫🇷", rate: 0.25, cap: 0.15, deadline: "3y" },
  AT: { en: "Austria 🇦🇹", pt: "Áustria 🇦🇹", rate: 0.25, cap: 0.20, deadline: "5y" },
  ES: { en: "Spain 🇪🇸", pt: "Espanha 🇪🇸", rate: 0.19, cap: 0.15, deadline: "4y" },
};
function TaxCalc({ lang }) {
  const [cc, setCc] = useState("CH");
  const [div, setDiv] = useState(160);
  const c = COUNTRIES[cc];
  const withheld = +(div * c.rate).toFixed(2);
  const reaches = +(div - withheld).toFixed(2);
  const reclaimable = +(div * (c.rate - c.cap)).toFixed(2);
  const stays = +(div * c.cap).toFixed(2);
  const rows = lang === "pt"
    ? [
      { l: "Dividendo bruto", v: div, c: "tx" },
      { l: `Retido na fonte (−${Math.round(c.rate * 100)}% ${cc})`, v: `−${withheld}`, c: "bad" },
      { l: "Chega até você", v: reaches, c: "good" },
      { l: `Reclamável (~${Math.round((c.rate - c.cap) * 100)}%)`, v: `+${reclaimable}`, c: "good" },
      { l: `Fica na fonte (~${Math.round(c.cap * 100)}%)`, v: `−${stays}`, c: "bad" },
      { l: `Prazo de prescrição`, v: c.deadline, c: "tx" },
    ]
    : [
      { l: "Gross dividend", v: div, c: "tx" },
      { l: `Withheld at source (−${Math.round(c.rate * 100)}% ${cc})`, v: `−${withheld}`, c: "bad" },
      { l: "Reaches you", v: reaches, c: "good" },
      { l: `Reclaimable (~${Math.round((c.rate - c.cap) * 100)}%)`, v: `+${reclaimable}`, c: "good" },
      { l: `Stays at source (~${Math.round(c.cap * 100)}%)`, v: `−${stays}`, c: "bad" },
      { l: `Prescription deadline`, v: c.deadline, c: "tx" },
    ];
  return (
    <motion.div
      className="tax-calc"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.4 }}
    >
      <div className="tax-calc-head">
        <span className="tax-calc-title">{lang === "pt" ? "Calculadora" : "Calculator"}</span>
        <span className="tax-calc-val">€{div}</span>
      </div>
      <div className="tax-country-pick">
        {Object.keys(COUNTRIES).map((k) => (
          <button key={k} className={`tax-country-chip ${cc === k ? "on" : ""}`} onClick={() => setCc(k)}>
            {COUNTRIES[k][lang]}
          </button>
        ))}
      </div>
      <input
        className="tax-calc-slider"
        type="range" min={50} max={1000} step={10} value={div}
        onChange={(e) => setDiv(Number(e.target.value))}
      />
      <div className="tax-calc-rows">
        {rows.map((r, k) => (
          <div key={k} className={`tax-calc-row ${r.c}`}>
            <span className="tax-calc-row-l">{r.l}</span>
            <span className="tax-calc-row-v">{typeof r.v === "number" ? `€${r.v}` : r.v}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ---------- fee calculator (scene 106) ----------
function FeeCalc({ lang }) {
  const [refund, setRefund] = useState(10000);
  const [volPct, setVolPct] = useState(2);
  const [minimum, setMinimum] = useState(50);
  const [successPct, setSuccessPct] = useState(5);
  const volFee = Math.max(minimum, +(refund * (volPct / 100)).toFixed(2));
  const successFee = +(refund * (successPct / 100)).toFixed(2);
  const bankEarns = +(volFee + successFee).toFixed(2);
  const investorGets = +(refund - bankEarns).toFixed(2);
  const rows = lang === "pt"
    ? [
      { l: "Reembolso recuperado", v: refund, c: "tx" },
      { l: `Fee por volume (${volPct}%, mín €${minimum})`, v: `−${volFee}`, c: "bad" },
      { l: `Success fee (${successPct}%)`, v: `−${successFee}`, c: "bad" },
      { l: "Banco ganha", v: bankEarns, c: "bad" },
      { l: "Investidor recebe", v: investorGets, c: "good" },
    ]
    : [
      { l: "Refund recovered", v: refund, c: "tx" },
      { l: `Volume fee (${volPct}%, min €${minimum})`, v: `−${volFee}`, c: "bad" },
      { l: `Success fee (${successPct}%)`, v: `−${successFee}`, c: "bad" },
      { l: "Bank earns", v: bankEarns, c: "bad" },
      { l: "Investor gets", v: investorGets, c: "good" },
    ];
  const sliders = [
    { label: lang === "pt" ? "Reembolso" : "Refund", val: refund, set: setRefund, min: 1000, max: 50000, step: 500, unit: "€" },
    { label: lang === "pt" ? "Volume %" : "Volume %", val: volPct, set: setVolPct, min: 0, max: 5, step: 0.5, unit: "%" },
    { label: lang === "pt" ? "Mínimo" : "Minimum", val: minimum, set: setMinimum, min: 0, max: 500, step: 10, unit: "€" },
    { label: lang === "pt" ? "Success %" : "Success %", val: successPct, set: setSuccessPct, min: 0, max: 15, step: 0.5, unit: "%" },
  ];
  return (
    <motion.div
      className="tax-calc"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.4 }}
    >
      <div className="tax-calc-head">
        <span className="tax-calc-title">{lang === "pt" ? "Calculadora de Fee" : "Fee Calculator"}</span>
        <span className="tax-calc-val">€{refund}</span>
      </div>
      {sliders.map((s, k) => (
        <div key={k} className="tax-fee-slider-row">
          <span className="tax-fee-slider-l">{s.label}: <b>{s.unit === "€" ? `€${s.val}` : `${s.val}${s.unit}`}</b></span>
          <input className="tax-calc-slider" type="range" min={s.min} max={s.max} step={s.step} value={s.val}
            onChange={(e) => s.set(Number(e.target.value))} />
        </div>
      ))}
      <div className="tax-calc-rows">
        {rows.map((r, k) => (
          <div key={k} className={`tax-calc-row ${r.c}`}>
            <span className="tax-calc-row-l">{r.l}</span>
            <span className="tax-calc-row-v">€{r.v}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function Narration({ id, lang, replayLabel, audioRef }) {
  const internalRef = useRef(null);
  const ref = audioRef || internalRef;
  const [missing, setMissing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const src = `${process.env.PUBLIC_URL}/audio/tax-${id}-${lang}.mp3`;

  // auto-play the narration when the scene (or language) changes
  useEffect(() => {
    setMissing(false);
    const a = ref.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); // browsers may block until first user gesture
  }, [id, lang, ref]);

  const toggle = () => {
    const a = ref.current;
    if (!a || missing) return;
    if (a.paused) { a.currentTime = a.currentTime || 0; a.play().then(() => setPlaying(true)).catch(() => {}); }
    else { a.pause(); setPlaying(false); }
  };

  return (
    <div className="tax-narr">
      <button className="tax-btn tiny" onClick={toggle} disabled={missing}>
        {missing ? "🔇" : playing ? "⏸" : "🔊"} {missing ? (lang === "pt" ? "sem áudio" : "no audio") : replayLabel}
      </button>
      <audio ref={ref} src={src} onError={() => setMissing(true)} preload="none"
        onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
    </div>
  );
}

function LangToggle({ lang, setLang, small }) {
  return (
    <div className={`tax-lang ${small ? "small" : ""}`}>
      <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
      <button className={lang === "pt" ? "on" : ""} onClick={() => setLang("pt")}>PT</button>
    </div>
  );
}

// ---------- quiz scene (one question per screen, after the story) ----------
function QuizScene({ scene, lang, t, onBack, onFinish }) {
  const d = scene[lang];
  const questions = d.questions || [];
  const [qi, setQi] = useState(0);
  const [chosen, setChosen] = useState({}); // qi -> chosen index
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem("tax101_best_streak") || 0));
  const [combo, setCombo] = useState(0); // milestone burst flag
  const q = questions[qi];
  const isLast = qi === questions.length - 1;
  const answered = chosen[qi] != null;
  const correct = answered && chosen[qi] === q.answer;
  const doneCount = Object.keys(chosen).length;
  const score = questions.reduce((s, qq, k) => s + (chosen[k] === qq.answer ? 1 : 0), 0);
  const allDone = doneCount === questions.length;

  const pick = (k) => {
    if (chosen[qi] != null) return;
    setChosen((c) => ({ ...c, [qi]: k }));
    if (k === q.answer) {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      setStreak((prev) => {
        const next = prev + 1;
        if (next > best) { setBest(next); try { localStorage.setItem("tax101_best_streak", String(next)); } catch {} }
        if (next === 3 || next === 5 || next === 7 || next === 10) {
          setCombo(next);
          confetti({ particleCount: 100, spread: 90, origin: { y: 0.4 }, startVelocity: 45 });
          setTimeout(() => setCombo(0), 1400);
        }
        return next;
      });
    } else {
      setStreak(0);
    }
  };
  const nextQ = () => setQi((n) => Math.min(questions.length - 1, n + 1));
  const prevQ = () => setQi((n) => Math.max(0, n - 1));

  // final rating tiers
  const pct = questions.length ? score / questions.length : 0;
  const rating = lang === "pt"
    ? (pct >= 0.9 ? { e: "🧙", t: "Mago do WHT", s: "Você dominou o domínio. Tá pronto pro reclaim." }
      : pct >= 0.7 ? { e: "🏅", t: "Pro do Reclaim", s: "Sólido. Só polir os detalhes da cadeia de custódia." }
      : pct >= 0.5 ? { e: "📚", t: "No caminho", s: "Entende o essencial. Revisa os prazos e o MiKaDiv." }
      : { e: "🌱", t: "Continua", s: "Relê a jornada — o fluxo beantragbar→vergütet é a chave." })
    : (pct >= 0.9 ? { e: "🧙", t: "WHT Wizard", s: "You own the domain. Ready for reclaim." }
      : pct >= 0.7 ? { e: "🏅", t: "Reclaim Pro", s: "Solid. Just polish the custody-chain details." }
      : pct >= 0.5 ? { e: "📚", t: "Getting there", s: "You get the essentials. Review deadlines and MiKaDiv." }
      : { e: "🌱", t: "Keep going", s: "Re-read the journey — the beantragbar→vergütet flow is the key." });

  useEffect(() => {
    if (allDone) confetti({ particleCount: 140, spread: 80, origin: { y: 0.5 } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  return (
    <div className="tax-quiz">
      <div className="tax-journey-head">
        <span className="tax-journey-emoji">{scene.fallback}</span>
        <div>
          <h2 className="tax-journey-title">{d.title}</h2>
          <p className="tax-journey-sub">{d.subtitle}</p>
        </div>
        <div className={`tax-streak ${streak >= 3 ? "hot" : ""}`} title={lang === "pt" ? "Sequência de acertos" : "Correct streak"}>
          <span className="tax-streak-flame">🔥</span>
          <span className="tax-streak-num">{streak}</span>
          <span className="tax-streak-best">{lang === "pt" ? "recorde" : "best"} {best}</span>
        </div>
      </div>

      <AnimatePresence>
        {combo > 0 && (
          <motion.div
            key={`combo-${combo}`}
            className="tax-combo"
            initial={{ opacity: 0, scale: 0.4, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}
          >
            <span className="tax-combo-flame">🔥</span>
            <span className="tax-combo-txt">{lang === "pt" ? `COMBO ${combo}x!` : `${combo}x COMBO!`}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="tax-flash-dots">
        {questions.map((qq, k) => (
          <span key={k} className={`tax-flash-dot ${k === qi ? "on" : ""} ${chosen[k] != null ? (chosen[k] === qq.answer ? "got" : "missed") : ""}`} />
        ))}
      </div>

      {allDone ? (
        <motion.div
          className="tax-quiz-summary"
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
        >
          <div className="tax-quiz-summary-emoji">{rating.e}</div>
          <h3 className="tax-quiz-summary-title">{rating.t}</h3>
          <div className="tax-quiz-summary-score">
            <span className="tax-quiz-summary-num">{score}</span>
            <span className="tax-quiz-summary-den">/{questions.length}</span>
          </div>
          <p className="tax-quiz-summary-sub">{rating.s}</p>
          <div className="tax-badges">
            {BADGES.map((b) => {
              const earned = b.check({ score, total: questions.length, best });
              return (
                <div key={b.id} className={`tax-badge ${earned ? "on" : "off"}`} title={b.desc[lang]}>
                  <span className="tax-badge-ico">{b.ico}</span>
                  <span className="tax-badge-name">{b.name[lang]}</span>
                  {!earned && <span className="tax-badge-lock">🔒</span>}
                </div>
              );
            })}
          </div>
        </motion.div>
      ) : (
      <AnimatePresence mode="wait">
        <motion.div
          key={qi}
          className="tax-quiz-card"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.26 }}
        >
          <div className="tax-quiz-q">{q.q}</div>
          <div className="tax-quiz-opts">
            {q.options.map((opt, k) => {
              let cls = "tax-quiz-opt";
              if (answered) {
                if (k === q.answer) cls += " correct";
                else if (k === chosen[qi]) cls += " picked-wrong";
                else cls += " dimmed";
              }
              return (
                <button key={k} className={cls} disabled={answered} onClick={() => pick(k)}>
                  <span className="tax-quiz-opt-letter">{String.fromCharCode(65 + k)}</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {answered && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`tax-quiz-feedback ${correct ? "ok" : "no"}`}
              >
                {correct ? `✓ ${lang === "pt" ? "Certo!" : "Correct!"}` : `✗ ${lang === "pt" ? "Quase!" : "Not quite."}`}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="tax-quiz-why"
              >
                <span className="tax-quiz-why-label">💡 {lang === "pt" ? "Por quê" : "Why"}</span>
                <span className="tax-quiz-why-text">{q.why}</span>
              </motion.div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
      )}

      <div className="tax-flash-nav">
        <button className="tax-btn ghost" onClick={onBack}>‹ {t.back}</button>
        <div className="tax-flash-nav-mid">
          <button className="tax-btn tiny" disabled={qi === 0} onClick={prevQ}>‹</button>
          <span className="tax-flash-count">{qi + 1} / {questions.length}{doneCount > 0 ? ` · ${score}✓` : ""}</span>
          <button className="tax-btn tiny" disabled={isLast} onClick={nextQ}>›</button>
        </div>
        {!isLast
          ? <button className="tax-btn primary" disabled={!answered} onClick={nextQ}>{lang === "pt" ? "Próxima ›" : "Next ›"}</button>
          : <button className="tax-btn primary" disabled={!allDone} onClick={onFinish}>{lang === "pt" ? `Concluir · ${score}/${questions.length} ›` : `Finish · ${score}/${questions.length} ›`}</button>}
      </div>
      <Narration id={scene.id} lang={lang} replayLabel={t.replay} />
    </div>
  );
}

// ---------- flash deck scene (key terms) ----------
const FLASH_CAT = {
  Quellensteuer: "tax", DBA: "tax", Stiftung: "tax",
  "RA-NR": "data", Lagerstelle: "data", Ansprüche: "data", Lagerstellennummer: "data",
  Wohnsitzbestätigung: "document", Druckprozess: "document",
  Vollmacht: "process", Antrag: "process", beantragbar: "process", erstattet: "process", vergütet: "process", Devisenkurs: "process",
  Ablauffrist: "deadline", verjährt: "deadline", Warnfrist: "deadline",
  MiKaDiv: "report",
};
const CAT_LABEL = {
  en: { tax: "Tax", data: "Data", document: "Document", process: "Process", deadline: "Deadline", report: "Report" },
  pt: { tax: "Imposto", data: "Dados", document: "Documento", process: "Processo", deadline: "Prazo", report: "Reporte" },
};
const CAT_COLOR = { tax: "#e0776a", data: "#4a90d9", document: "#e6b23c", process: "#3fb6c8", deadline: "#895BB7", report: "#3fae6b" };

function speak(term, lang) {
  try {
    const u = new SpeechSynthesisUtterance(term);
    u.lang = "de-DE";
    u.rate = 0.92;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch { /* speechSynthesis may be unavailable */ }
}

function FlashDeck({ scene, lang, t, onBack, onFinish }) {
  const d = scene[lang];
  const allCards = d.cards || [];
  const [deck, setDeck] = useState(allCards);
  const [reviewing, setReviewing] = useState(false);
  const [ci, setCi] = useState(0);
  const [flipped, setFlipped] = useState({});
  const [results, setResults] = useState({}); // ci -> "got" | "missed"
  const [saved, setSaved] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("tax101_saved_terms") || "[]")); }
    catch { return new Set(); }
  });
  const [showSaved, setShowSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const cards = showSaved ? allCards.filter((c) => saved.has(c.term)) : deck;
  const card = cards[ci];
  const isLast = ci === cards.length - 1;
  const doneCount = Object.keys(results).length;
  const gotCount = Object.values(results).filter((r) => r === "got").length;
  const missedCount = Object.values(results).filter((r) => r === "missed").length;
  const allDone = doneCount === cards.length;

  const persist = (next) => {
    setSaved(next);
    try { localStorage.setItem("tax101_saved_terms", JSON.stringify([...next])); } catch {}
  };
  const toggleSave = (term) => {
    const next = new Set(saved);
    if (next.has(term)) next.delete(term); else next.add(term);
    persist(next);
  };
  const clearSaved = () => persist(new Set());
  const exportSaved = async () => {
    const lines = allCards.filter((c) => saved.has(c.term))
      .map((c) => `${c.term}\t${c.def}`);
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard may be blocked */ }
  };

  const flip = () => setFlipped((f) => ({ ...f, [ci]: true }));
  const prevCard = () => setCi((n) => Math.max(0, n - 1));
  const nextCard = () => setCi((n) => Math.min(cards.length - 1, n + 1));
  const grade = (r) => {
    setResults((s) => ({ ...s, [ci]: r }));
    if (ci < cards.length - 1) setTimeout(() => setCi((n) => n + 1), 220);
  };

  // "review only missed" mode: rebuild the deck from the missed cards of the full run
  const reviewMissed = () => {
    const missed = allCards.map((c, k) => ({ c, k })).filter((_, k) => results[k] === "missed").map((x) => x.c);
    if (!missed.length) return;
    setDeck(missed);
    setReviewing(true);
    setShowSaved(false);
    setCi(0);
    setFlipped({});
    setResults({});
  };
  const backToSummary = () => {
    setDeck(allCards);
    setReviewing(false);
    setShowSaved(false);
    setCi(0);
    setFlipped({});
    setResults({});
  };
  const openSaved = () => {
    setDeck(allCards.filter((c) => saved.has(c.term)));
    setShowSaved(true);
    setReviewing(false);
    setCi(0);
    setFlipped({});
    setResults({});
  };

  // final rating tiers (self-assessed)
  const pct = cards.length ? gotCount / cards.length : 0;
  const rating = lang === "pt"
    ? (pct >= 0.9 ? { e: "🧠", t: "Vocabulário dominado", s: "Você sabe os termos. Bora pro quiz confirmar." }
      : pct >= 0.7 ? { e: "💪", t: "Quase tudo", s: "Sólido. Revisa os cards amarelos antes de seguir." }
      : pct >= 0.5 ? { e: "📖", t: "No caminho", s: "Entende a metade. Vira os amarelos de novo." }
      : { e: "🔄", t: "Vira de novo", s: "Vale reler os cards — são a base do domínio." })
    : (pct >= 0.9 ? { e: "🧠", t: "Vocabulary locked", s: "You own the terms. Hit the quiz to confirm." }
      : pct >= 0.7 ? { e: "💪", t: "Almost there", s: "Solid. Revisit the amber cards before moving on." }
      : pct >= 0.5 ? { e: "📖", t: "Getting there", s: "You know half. Flip the amber ones again." }
      : { e: "🔄", t: "Flip again", s: "Worth re-reading the cards — they're the base of the domain." });

  useEffect(() => {
    if (allDone) confetti({ particleCount: 120, spread: 75, origin: { y: 0.5 } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  return (
    <div className="tax-flash">
      <div className="tax-journey-head">
        <span className="tax-journey-emoji">{scene.fallback}</span>
        <div>
          <h2 className="tax-journey-title">{d.title}</h2>
          <p className="tax-journey-sub">{d.subtitle}</p>
        </div>
        <button
          className={`tax-btn tiny tax-saved-btn ${saved.size > 0 ? "has" : ""}`}
          onClick={() => (showSaved ? backToSummary() : openSaved())}
          title={lang === "pt" ? "Termos salvos" : "Saved terms"}
        >
          {showSaved ? "✕" : "🔖"} {saved.size}
        </button>
      </div>

      <div className="tax-flash-dots">
        {cards.map((c, k) => {
          const cat = FLASH_CAT[c.term] || "process";
          const col = CAT_COLOR[cat];
          const graded = results[k];
          return (
            <span
              key={k}
              className={`tax-flash-dot ${k === ci ? "on" : ""} ${graded ? graded : ""}`}
              style={!graded ? { background: col, borderColor: col } : undefined}
            />
          );
        })}
      </div>

      {!showSaved && allDone ? (
        <motion.div
          className="tax-quiz-summary"
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
        >
          <div className="tax-quiz-summary-emoji">{rating.e}</div>
          <h3 className="tax-quiz-summary-title">{rating.t}</h3>
          <div className="tax-quiz-summary-score">
            <span className="tax-quiz-summary-num">{gotCount}</span>
            <span className="tax-quiz-summary-den">/{cards.length}</span>
          </div>
          <p className="tax-quiz-summary-sub">{rating.s}</p>
          {!reviewing && missedCount > 0 && (
            <button className="tax-btn primary tax-summary-action" onClick={reviewMissed}>
              {lang === "pt" ? `↻ Revisar ${missedCount} erros` : `↻ Review ${missedCount} missed`}
            </button>
          )}
          {reviewing && (
            <button className="tax-btn ghost tax-summary-action" onClick={backToSummary}>
              {lang === "pt" ? "← Voltar ao resumo" : "← Back to summary"}
            </button>
          )}
          {saved.size > 0 && (
            <div className="tax-saved-panel">
              <div className="tax-saved-panel-head">
                <span className="tax-saved-panel-title">
                  {lang === "pt" ? `Termos salvos (${saved.size})` : `Saved terms (${saved.size})`}
                </span>
                <div className="tax-saved-panel-actions">
                  <button className="tax-btn tiny primary" onClick={openSaved}>
                    {lang === "pt" ? "Estudar salvos ›" : "Study saved ›"}
                  </button>
                  <button className="tax-btn tiny ghost" onClick={exportSaved}>
                    {copied ? (lang === "pt" ? "✓ Copiado" : "✓ Copied") : (lang === "pt" ? "⧉ Copiar" : "⧉ Copy")}
                  </button>
                  <button className="tax-btn tiny ghost" onClick={clearSaved}>
                    {lang === "pt" ? "Limpar" : "Clear"}
                  </button>
                </div>
              </div>

              {/* per-category breakdown */}
              <div className="tax-saved-cats">
                {Object.keys(CAT_LABEL[lang]).map((ck) => {
                  const n = allCards.filter((c) => saved.has(c.term) && (FLASH_CAT[c.term] || "process") === ck).length;
                  if (!n) return null;
                  return (
                    <span key={ck} className="tax-saved-cat">
                      <span className="tax-saved-cat-dot" style={{ background: CAT_COLOR[ck] }} />
                      {CAT_LABEL[lang][ck]} <b>{n}</b>
                    </span>
                  );
                })}
              </div>

              <ul className="tax-saved-list">
                {allCards.filter((c) => saved.has(c.term)).map((c) => (
                  <li key={c.term} className="tax-saved-item">
                    <span className="tax-saved-term">{c.term}</span>
                    <span className="tax-saved-def">{c.def}</span>
                    <button className="tax-saved-remove" onClick={() => toggleSave(c.term)} title={lang === "pt" ? "Remover" : "Remove"}>✕</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="tax-flash-cat-legend">
            {Object.keys(CAT_LABEL[lang]).map((ck) => (
              <span key={ck} className="tax-flash-cat-leg">
                <span className="tax-flash-cat-leg-dot" style={{ background: CAT_COLOR[ck] }} />
                {CAT_LABEL[lang][ck]}
              </span>
            ))}
          </div>
        </motion.div>
      ) : cards.length === 0 ? (
        <div className="tax-flash-empty">
          <div className="tax-flash-empty-ico">🔖</div>
          <p className="tax-flash-empty-txt">
            {lang === "pt"
              ? "Nenhum termo salvo ainda. Toque no ☆ de um card pra salvar pra depois."
              : "No saved terms yet. Tap the ☆ on a card to save it for later."}
          </p>
          <button className="tax-btn ghost" onClick={backToSummary}>
            {lang === "pt" ? "← Voltar" : "← Back"}
          </button>
        </div>
      ) : (
      <div className="tax-flash-stage" style={{ perspective: "1100px" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={ci}
            className={`tax-flash-card ${flipped[ci] ? "flipped" : ""}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22 }}
            role="button"
            tabIndex={0}
            onClick={flip}
            onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !flipped[ci]) { e.preventDefault(); flip(); } }}
          >
            <div className="tax-flash-face tax-flash-front">
              <span className="tax-flash-cat" style={{ background: CAT_COLOR[FLASH_CAT[card.term] || "process"] }}>
                {CAT_LABEL[lang][FLASH_CAT[card.term] || "process"]}
              </span>
              <button className="tax-flash-speak" onClick={(e) => { e.stopPropagation(); speak(card.term); }} title="Speak">🔊</button>
              <span className={`tax-flash-term ${saved.has(card.term) ? "saved" : ""}`}>
                {card.term}
                <button
                  className="tax-flash-save-star"
                  onClick={(e) => { e.stopPropagation(); toggleSave(card.term); }}
                  onKeyDown={(e) => e.stopPropagation()}
                  title={lang === "pt" ? "Clique pra salvar" : "Click to save"}
                  aria-pressed={saved.has(card.term)}
                >{saved.has(card.term) ? "★" : "☆"}</button>
              </span>
              <span className="tax-flash-hint">{lang === "pt" ? "Toque pra revelar" : "Tap to reveal"}</span>
            </div>
            <div className="tax-flash-face tax-flash-back">
              <span className="tax-flash-cat" style={{ background: CAT_COLOR[FLASH_CAT[card.term] || "process"] }}>
                {CAT_LABEL[lang][FLASH_CAT[card.term] || "process"]}
              </span>
              <button className="tax-flash-speak" onClick={(e) => { e.stopPropagation(); speak(card.term); }} title="Speak">🔊</button>
              <span className="tax-flash-term-sm">{card.term}</span>
              <p className="tax-flash-def">{card.def}</p>
              <button
                className={`tax-flash-save-btn ${saved.has(card.term) ? "on" : ""}`}
                onClick={(e) => { e.stopPropagation(); toggleSave(card.term); }}
              >
                {saved.has(card.term)
                  ? (lang === "pt" ? "★ Salvo" : "★ Saved")
                  : (lang === "pt" ? "☆ Salvar significado" : "☆ Save meaning")}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      )}

      {/* self-assessment: only after the card has been flipped */}
      {!allDone && (
      <div className="tax-flash-grade">
        {!flipped[ci] && <span className="tax-flash-grade-hint">{lang === "pt" ? "Vire o card pra se avaliar" : "Flip the card to self-assess"}</span>}
        {flipped[ci] && !results[ci] && (
          <>
            <button className="tax-btn ghost grade-miss" onClick={() => grade("missed")}>{lang === "pt" ? "Errei ✗" : "Missed ✗"}</button>
            <button className="tax-btn primary grade-got" onClick={() => grade("got")}>{lang === "pt" ? "Acertei ✓" : "Got it ✓"}</button>
          </>
        )}
        {results[ci] && (
          <span className={`tax-flash-graded ${results[ci]}`}>
            {results[ci] === "got" ? (lang === "pt" ? "✓ Marca verde" : "✓ Marked green") : (lang === "pt" ? "✗ Marca amarela" : "✗ Marked amber")}
          </span>
        )}
      </div>
      )}

      <div className="tax-flash-nav">
        <button className="tax-btn ghost" onClick={onBack}>‹ {t.back}</button>
        <div className="tax-flash-nav-mid">
          <button className="tax-btn tiny" disabled={ci === 0} onClick={prevCard}>‹</button>
          <span className="tax-flash-count">{ci + 1} / {cards.length}{doneCount > 0 ? ` · ${gotCount}✓` : ""}</span>
          <button className="tax-btn tiny" disabled={isLast} onClick={nextCard}>›</button>
        </div>
        <button className="tax-btn primary" disabled={!allDone} onClick={showSaved ? backToSummary : reviewing ? backToSummary : onFinish}>
          {showSaved
            ? (lang === "pt" ? "← Voltar ao resumo" : "← Back to summary")
            : allDone
              ? (reviewing
                  ? (lang === "pt" ? `Concluir revisão · ${gotCount}/${cards.length} ›` : `Finish review · ${gotCount}/${cards.length} ›`)
                  : `${lang === "pt" ? "Concluir" : "Finish"} · ${gotCount}/${cards.length} ›`)
              : (lang === "pt" ? "Concluir ›" : "Finish ›")}
        </button>
      </div>
      <Narration id={scene.id} lang={lang} replayLabel={t.replay} />
    </div>
  );
}

// ---------- flow diagram (data-driven visual for narrative scenes) ----------
// emoji → corporate line-icon map (keeps content unchanged, upgrades the look)
const FLOW_ICON = {
  "🧑‍💼": "person", "🏢": "building", "💵": "coin", "✂️": "cut", "🏛️": "bank",
  "📝": "doc", "⏳": "clock", "⚡": "bolt", "🎯": "target", "📜": "scroll", "💰": "money",
  "📦": "package", "🚩": "flag", "⏰": "alarm", "💼": "briefcase", "🔍": "search", "🔢": "hash", "🖨️": "printer", "✉️": "mail", "🏠": "home", "⚠": "warn",
};
const ICON_PATHS = {
  person: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>,
  building: <><rect x="5" y="4" width="14" height="17" rx="1.5" /><path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2" /></>,
  coin: <><circle cx="12" cy="12" r="8" /><path d="M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4M12 6.5v11" /></>,
  cut: <><circle cx="7" cy="7" r="2.4" /><circle cx="7" cy="17" r="2.4" /><path d="M9 8.5l11 7M9 15.5l11-7" /></>,
  bank: <><path d="M4 9l8-5 8 5" /><path d="M5.5 9v8M10 9v8M14 9v8M18.5 9v8" /><path d="M3.5 20h17" /></>,
  doc: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h6M10 15h6M10 18h4" /></>,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
  bolt: <><path d="M13 3L5 13h6l-1 8 8-10h-6z" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1.2" /></>,
  scroll: <><path d="M8 4h9v14a2 2 0 0 0 2 2H8a2 2 0 0 1-2-2V6" /><path d="M15 4v14M9 9h5M9 12h5" /></>,
  money: <><rect x="3.5" y="7" width="17" height="10" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6.5 10v4M17.5 10v4" /></>,
  package: <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9" /></>,
  flag: <><path d="M6 21V4M6 4h12l-2.5 4L18 12H6" /></>,
  alarm: <><path d="M7 4L4 7M17 4l3 3" /><circle cx="12" cy="13" r="7" /><path d="M12 9v4l2.5 1.5" /></>,
  briefcase: <><rect x="3.5" y="8" width="17" height="11" rx="2" /><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3.5 13h17" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></>,
  hash: <><path d="M9 4l-1 16M16 4l-1 16M5 9h14M4 15h14" /></>,
  printer: <><path d="M7 9V4h10v5" /><rect x="4" y="9" width="16" height="8" rx="1.5" /><path d="M7 14h10v5H7z" /><circle cx="17" cy="12" r="0.8" /></>,
  mail: <><rect x="3.5" y="6" width="17" height="12" rx="2" /><path d="M4 8l8 6 8-6" /></>,
  home: <><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9M10 19v-5h4v5" /></>,
  warn: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17.5v0.5" /></>,
};
function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="tax-flow-svg">
      {ICON_PATHS[name] || ICON_PATHS.doc}
    </svg>
  );
}

// Narration-synced flow animator. Timings aligned to the REAL spoken audio
// (dubbing/flow-beats-aligned.json). Each `at` is a fraction of the audio
// duration, per language {en, pt}. A number is shared across langs.
const NARR_FLOW = {
  1: {
    border: true,
    reveal: [{ en: 0.02, pt: 0.02 }, { en: 0.02, pt: 0.02 }],
    tokens: [{ at: { en: 0.52, pt: 0.505 }, icon: "💰", from: 1, to: 0, dur: 0.16, label: "€160", shrinkAt: { en: 0.60, pt: 0.585 }, shrinkLabel: "€104" }],
    cut: { at: { en: 0.60, pt: 0.585 }, between: [0, 1], lost: "−35%" },
    fallbackDur: 28,
  },
  3: {
    reveal: [
      { en: 0.02, pt: 0.02 },
      { en: 0.27, pt: 0.28 },
      { en: 0.33, pt: 0.34 },
      { en: 0.40, pt: 0.41 },
    ],
    tokens: [
      { at: { en: 0.27, pt: 0.28 }, icon: "✂️", from: 0, to: 1, dur: 0.06, label: "−35%" },
      { at: { en: 0.40, pt: 0.41 }, icon: "💰", from: 0, to: 3, dur: 0.12, label: "€160", shrinkAt: { en: 0.27, pt: 0.28 }, shrinkLabel: "€104" },
    ],
    split: { at: { en: 0.66, pt: 0.65 }, on: 2, from: "€56", into: ["€32 ↩", "€24 🔒"] },
    fallbackDur: 30,
  },
  4: {
    reveal: [
      { en: 0.01, pt: 0.01 },
      { en: 0.12, pt: 0.12 },
      { en: 0.30, pt: 0.30 },
      { en: 0.52, pt: 0.52 },
    ],
    tokens: [
      { at: { en: 0.12, pt: 0.12 }, icon: "💵", from: 0, to: 1, dur: 0.08, label: "€160", shrinkAt: { en: 0.12, pt: 0.12 }, shrinkLabel: "€104" },
      { at: { en: 0.30, pt: 0.30 }, icon: "💵", from: 1, to: 2, dur: 0.08 },
      { at: { en: 0.52, pt: 0.52 }, icon: "✂️", from: 2, to: 3, dur: 0.08, label: "×2" },
    ],
    stamp: { at: { en: 0.58, pt: 0.58 }, text: "×2", sub: "double taxation" },
    fallbackDur: 9,
  },
  7: {
    reveal: [
      { en: 0.02, pt: 0.02 },
      { en: 0.10, pt: 0.08 },
      { en: 0.27, pt: 0.26 },
      { en: 0.48, pt: 0.47 },
    ],
    tokens: [
      { at: { en: 0.10, pt: 0.08 }, icon: "📝", from: 0, to: 1, dur: 0.06 },
      { at: { en: 0.48, pt: 0.47 }, icon: "💰", from: 3, to: 2, dur: 0.12, match: true },
    ],
    stamp: { at: { en: 0.27, pt: 0.26 }, on: 2, label: "RA-2024-0123" },
    fallbackDur: 24,
  },
  10: {
    flow: { nodes: [ {icon:"💰",label:"Refund"}, {icon:"🏦",label:"Bank"}, {icon:"✂️",label:"fee",tone:"bad"}, {icon:"🧑‍💼",label:"You",tone:"good"} ] },
    reveal: [
      { en: 0.02, pt: 0.02 },
      { en: 0.02, pt: 0.02 },
      { en: 0.56, pt: 0.55 },
      { en: 0.61, pt: 0.60 },
    ],
    tokens: [
      { at: { en: 0.02, pt: 0.02 }, icon: "💰", from: 0, to: 1, dur: 0.08 },
      { at: { en: 0.56, pt: 0.55 }, icon: "💰", from: 1, to: 3, dur: 0.10, label: "€32", shrinkAt: { en: 0.61, pt: 0.60 }, shrinkLabel: "líquido" },
    ],
    pills: [
      { at: { en: 0.42, pt: 0.42 }, label: "erstattet", tone: "good" },
      { at: { en: 0.61, pt: 0.60 }, label: "vergütet", tone: "good" },
    ],
    swap: { at: { en: 0.20, pt: 0.19 }, from: "CHF", to: "EUR" },
    match: { at: { en: 0.16, pt: 0.15 }, on: 1 },
    fallbackDur: 40,
  },
  2: {
    reveal: [{ en: 0.003, pt: 0.003 }, { en: 0.11, pt: 0.11 }, { en: 0.57, pt: 0.58 }],
    tokens: [
      { at: { en: 0.003, pt: 0.003 }, icon: "💵", from: 0, to: 1, dur: 0.10 },
      { at: { en: 0.35, pt: 0.33 }, icon: "💵", from: 1, to: 2, dur: 0.12, label: "€160" },
    ],
    note: { at: { en: 0.20, pt: 0.20 }, on: 1, text: "200 × €0.80" },
    fallbackDur: 36,
  },
  5: {
    reveal: [
      { en: 0.003, pt: 0.003 },
      { en: 0.06, pt: 0.06 },
      { en: 0.21, pt: 0.20 },
      { en: 0.31, pt: 0.31 },
      { en: 0.52, pt: 0.53 },
    ],
    tokens: [
      { at: { en: 0.21, pt: 0.20 }, icon: "💰", from: 0, to: 2, dur: 0.06, label: "35%", shrinkAt: { en: 0.21, pt: 0.20 }, shrinkLabel: "25%" },
      { at: { en: 0.31, pt: 0.31 }, icon: "💰", from: 2, to: 3, dur: 0.10, label: "~20%" },
    ],
    note: { at: { en: 0.58, pt: 0.58 }, on: 4, text: "Stiftung → 20%" },
    fallbackDur: 35,
  },
  6: {
    reveal: [
      { en: 0.20, pt: 0.19 }, { en: 0.20, pt: 0.19 }, { en: 0.20, pt: 0.19 },
      { en: 0.42, pt: 0.40 }, { en: 0.42, pt: 0.40 }, { en: 0.42, pt: 0.40 },
      { en: 0.61, pt: 0.58 }, { en: 0.61, pt: 0.58 }, { en: 0.61, pt: 0.58 },
    ],
    tokens: [
      { at: { en: 0.20, pt: 0.19 }, icon: "💰", from: 0, to: 2, dur: 0.10 },
      { at: { en: 0.42, pt: 0.40 }, icon: "💰", from: 3, to: 5, dur: 0.06 },
      { at: { en: 0.61, pt: 0.58 }, icon: "💵", from: 6, to: 8, dur: 0.08 },
    ],
    notes: [
      { at: { en: 0.50, pt: 0.48 }, on: 5, text: "⚡ faster" },
      { at: { en: 0.70, pt: 0.68 }, on: 8, text: "na fonte" },
    ],
    fallbackDur: 15,
  },
  8: {
    reveal: [
      { en: 0.003, pt: 0.003 },
      { en: 0.10, pt: 0.10 },
      { en: 0.18, pt: 0.18 },
      { en: 0.26, pt: 0.26 },
      { en: 0.76, pt: 0.76 },
    ],
    tokens: [
      { at: { en: 0.18, pt: 0.18 }, icon: "✉️", from: 2, to: 3, dur: 0.10 },
      { at: { en: 0.76, pt: 0.76 }, icon: "📦", from: 3, to: 4, dur: 0.10 },
    ],
    note: { at: { en: 0.34, pt: 0.34 }, on: 3, text: "≈2 semanas" },
    fallbackDur: 33,
  },
  103: {
    reveal: [
      { en: 0.10, pt: 0.10 },
      { en: 0.175, pt: 0.175 },
      { en: 0.40, pt: 0.42 },
      { en: 0.50, pt: 0.50 },
      { en: 0.58, pt: 0.58 },
    ],
    tokens: [{ at: { en: 0.10, pt: 0.10 }, icon: "🔗", from: 0, to: 4, dur: 0.48 }],
    match: { at: { en: 0.40, pt: 0.42 }, on: 2 },
    note: { at: { en: 0.46, pt: 0.48 }, on: 2, text: "Lagerstellen-Nr" },
    fallbackDur: 39,
  },
  104: {
    reveal: [
      { en: 0.24, pt: 0.22 }, { en: 0.24, pt: 0.22 },
      { en: 0.52, pt: 0.52 }, { en: 0.52, pt: 0.52 }, { en: 0.70, pt: 0.70 },
    ],
    tokens: [
      { at: { en: 0.24, pt: 0.22 }, icon: "📄", from: 0, to: 1, dur: 0.08 },
      { at: { en: 0.52, pt: 0.52 }, icon: "📄", from: 2, to: 3, dur: 0.08 },
      { at: { en: 0.70, pt: 0.70 }, icon: "📄", from: 3, to: 4, dur: 0.08 },
    ],
    notes: [
      { at: { en: 0.34, pt: 0.32 }, on: 1, text: "sem cliente" },
      { at: { en: 0.62, pt: 0.62 }, on: 3, text: "cliente assina" },
    ],
    fallbackDur: 29,
  },
  105: {
    reveal: [
      { en: 0.12, pt: 0.12 },
      { en: 0.21, pt: 0.20 },
      { en: 0.28, pt: 0.27 },
      { en: 0.35, pt: 0.36 },
      { en: 0.50, pt: 0.53 },
      { en: 0.65, pt: 0.66 },
    ],
    tokens: [
      { at: { en: 0.50, pt: 0.53 }, icon: "⏳", from: 0, to: 4, dur: 0.08 },
      { at: { en: 0.65, pt: 0.66 }, icon: "✂️", from: 4, to: 5, dur: 0.08, label: "verjährt" },
    ],
    stamp: { at: { en: 0.72, pt: 0.73 }, text: "PERDIDO", sub: "pra sempre" },
    fallbackDur: 33,
  },
  106: {
    reveal: [
      { en: 0.003, pt: 0.003 },
      { en: 0.09, pt: 0.08 },
      { en: 0.28, pt: 0.25 },
      { en: 0.40, pt: 0.40 },
      { en: 0.62, pt: 0.62 },
    ],
    tokens: [
      { at: { en: 0.09, pt: 0.08 }, icon: "💰", from: 0, to: 1, dur: 0.08, label: "€32" },
      { at: { en: 0.28, pt: 0.25 }, icon: "✂️", from: 1, to: 2, dur: 0.06, label: "volume", shrinkAt: { en: 0.28, pt: 0.25 } },
      { at: { en: 0.40, pt: 0.40 }, icon: "✂️", from: 1, to: 3, dur: 0.06, label: "success", shrinkAt: { en: 0.40, pt: 0.40 } },
      { at: { en: 0.62, pt: 0.62 }, icon: "💰", from: 1, to: 4, dur: 0.10, label: "€32", shrinkAt: { en: 0.62, pt: 0.62 }, shrinkLabel: "líquido" },
    ],
    note: { at: { en: 0.50, pt: 0.50 }, on: 1, text: "banco ganha 2×" },
    fallbackDur: 30,
  },
};

function NarrFlow({ flow, audioRef, cfg, lang }) {
  const wrapRef = useRef(null);
  const [frac, setFrac] = useState(0);
  const [pos, setPos] = useState([]);
  const [rowBox, setRowBox] = useState(null);

  // override flow (scene 10)
  const useFlow = cfg.flow || flow;
  const rows = useFlow?.rows || [{ nodes: useFlow?.nodes || [] }];
  const flatNodes = rows.flatMap((r) => r.nodes || []);
  const reveal = cfg.reveal || flatNodes.map((_, k) => 0.05 + (k / Math.max(1, flatNodes.length)) * 0.3);

  // measure node centers across ALL rows (flat indices) + first row's vertical extent, on mount + resize
  useEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const wb = wrap.getBoundingClientRect();
      const ps = [];
      wrap.querySelectorAll("[data-nf-node]").forEach((n) => {
        const b = n.getBoundingClientRect();
        ps.push({ x: b.left - wb.left + b.width / 2, y: b.top - wb.top + b.height / 2 });
      });
      setPos(ps);
      const firstRow = wrap.querySelector(".tax-flow-row");
      if (firstRow) {
        const rb = firstRow.getBoundingClientRect();
        setRowBox({ top: rb.top - wb.top, bottom: rb.bottom - wb.top });
      }
    };
    const id = setTimeout(measure, 60); // wait for layout/entrance
    window.addEventListener("resize", measure);
    return () => { clearTimeout(id); window.removeEventListener("resize", measure); };
  }, [useFlow]);

  // sync animation progress to the narration audio (rAF), fallback timer if no audio
  useEffect(() => {
    let raf;
    const start = performance.now();
    const fbDur = (cfg.fallbackDur || 22) * 1000;
    const tick = () => {
      const a = audioRef?.current;
      if (a && isFinite(a.duration) && a.duration > 0) {
        setFrac(Math.min(1, a.currentTime / a.duration));
      } else {
        setFrac(Math.min(1, (performance.now() - start) / fbDur));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [audioRef, cfg]);

  // resolve a per-lang timing: number (shared) or {en, pt}
  const at = (v) => (v == null ? null : typeof v === "number" ? v : v[lang]);
  const shown = (k) => frac >= at(reveal[k]);
  const lerp = (a, b, t) => a + (b - a) * t;

  // any token currently crossing the customs border? (drives the border highlight)
  const anyCrossing = !!(cfg.border && (cfg.tokens || []).some(
    (tk) => tk.shrinkAt != null && frac >= at(tk.shrinkAt) && frac < at(tk.shrinkAt) + 0.04
  ));
  // any token approaching the border (hasn't crossed yet)? pre-cue glow on the gate
  const anyNear = !!(cfg.border && (cfg.tokens || []).some(
    (tk) => tk.shrinkAt != null && frac >= at(tk.at) && frac < at(tk.shrinkAt)
  ));

  // flat offset per row (so arrows/nodes use global indices)
  let flat = 0;

  return (
    <motion.div
      className={`tax-flow hero tax-narrflow${anyCrossing ? " crossing" : ""}${anyNear ? " near" : ""}`}
      ref={wrapRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.35 }}
    >
      {/* two-territory backdrop: home (left) vs abroad (right), split at the border (scene 1) */}
      {cfg.border && rowBox && pos.length >= 2 && (
        <>
        <div className="tax-nf-territories" aria-hidden="true">
          <span className="tax-nf-terr home" style={{ width: lerp(pos[0]?.x || 0, pos[1]?.x || 0, 0.5) }}>
            <span className="tax-nf-terr-flag">🏠</span>
            <span className="tax-nf-terr-lbl">{lang === "pt" ? "seu país" : "home"}</span>
          </span>
          <span className="tax-nf-terr abroad">
            <span className="tax-nf-terr-lbl">{lang === "pt" ? "exterior" : "abroad"}</span>
            <span className="tax-nf-terr-flag">🌍</span>
          </span>
        </div>
        {/* continuous flow particles along the path — the "pipe" the money travels through */}
        <div className="tax-nf-flow" aria-hidden="true" style={{ left: pos[0].x, width: pos[1].x - pos[0].x, top: rowBox.top + (rowBox.bottom - rowBox.top) / 2 }}>
          {[...Array(4)].map((_, i) => (
            <span key={i} className="tax-nf-flow-dot" style={{ animationDelay: `${i * 0.7}s` }} />
          ))}
        </div>
        </>
      )}

      {rows.map((r, ri) => {
        const base = flat;
        flat += r.nodes.length;
        return (
        <div className="tax-flow-row" key={ri} style={{ position: "relative" }}>
          {r.label && <span className="tax-flow-row-label">{r.label}</span>}
          <div className="tax-flow-nodes">
            {r.nodes.map((n, k) => {
              const fk = base + k;
              const on = shown(fk);
              const arrived = (cfg.tokens || []).some((tk) => tk.to === fk && frac >= at(tk.at) + (tk.dur || 0.1));
              return (
                <React.Fragment key={k}>
                  <motion.span
                    data-nf-node
                    className={`tax-flow-node ${n.tone ? `tone-${n.tone}` : ""} ${on ? "on" : ""} ${arrived ? "arrived" : ""}`}
                    initial={{ opacity: 0, scale: 0.6, y: 8 }}
                    animate={on ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.6, y: 8 }}
                    transition={{ type: "spring", stiffness: 280, damping: 20 }}
                  >
                    <span className="tax-flow-node-ico">
                      {FLOW_ICON[n.icon] ? <Icon name={FLOW_ICON[n.icon]} /> : <span className="tax-flow-emoji">{n.icon}</span>}
                    </span>
                    <span className="tax-flow-node-label">{n.label}</span>
                    {/* stamp label (e.g. RA-NR onto Antrag) */}
                    {cfg.stamp && cfg.stamp.on === fk && frac >= at(cfg.stamp.at) && (
                      <motion.span className="tax-nf-stamp" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 320 }}>
                        {cfg.stamp.label}
                      </motion.span>
                    )}
                    {/* match glow on a node */}
                    {cfg.match && cfg.match.on === fk && frac >= at(cfg.match.at) && (
                      <motion.span className="tax-nf-match" initial={{ scale: 0, opacity: 1 }} animate={{ scale: 2.4, opacity: 0 }} transition={{ duration: 0.9, repeat: Infinity }} />
                    )}
                    {/* one-shot arrival ring when a token lands here */}
                    {arrived && (
                      <motion.span className="tax-nf-arrive" initial={{ scale: 0.6, opacity: 0.9 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} />
                    )}
                  </motion.span>
                  {k < r.nodes.length - 1 && (
                    <motion.span
                      className={`tax-flow-arrow ${shown(fk) && shown(fk + 1) ? "on" : ""}`}
                      initial={{ opacity: 0, x: -6 }}
                      animate={shown(fk) && shown(fk + 1) ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
                      transition={{ duration: 0.25 }}
                    >→</motion.span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
        );
      })}

          {/* dashed border / customs gate between node 0 and 1 (scene 1) */}
          {cfg.border && pos.length >= 2 && rowBox && (
            <div className="tax-nf-border" style={{ left: lerp(pos[0]?.x || 0, pos[1]?.x || 0, 0.5), top: rowBox.top + 6, height: Math.max(20, rowBox.bottom - rowBox.top - 12) }}>
              <span className="tax-nf-border-gate">🛂</span>
              <span className="tax-nf-border-arm" aria-hidden="true" />
              <span className="tax-nf-border-label">{lang === "pt" ? "fronteira" : "border"}</span>
            </div>
          )}

          {/* cut ✂️ + lost chunk + red shard burst at the midpoint between two nodes */}
          {cfg.cut && pos.length >= 2 && rowBox && frac >= at(cfg.cut.at) && (
            <motion.div className="tax-nf-cut" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} style={{ left: lerp(pos[cfg.cut.between[0]]?.x || 0, pos[cfg.cut.between[1]]?.x || 0, 0.5), top: rowBox.top + (rowBox.bottom - rowBox.top) / 2 }}>
              <span className="tax-nf-cut-ico">✂️</span>
              <motion.span className="tax-nf-cut-lost" initial={{ y: 0, opacity: 1, scale: 1 }} animate={{ y: -30, opacity: 0, scale: 0.8 }} transition={{ duration: 1.1, ease: "easeOut" }}>{cfg.cut.lost}</motion.span>
              {/* red shard burst — fragments fly out radially when the tax is sliced */}
              {[...Array(6)].map((_, i) => {
                const ang = (i * 60) * Math.PI / 180;
                return (
                  <motion.span
                    key={i}
                    className="tax-nf-cut-shard"
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: Math.cos(ang) * 22, y: Math.sin(ang) * 22 - 8, opacity: 0, scale: 0.3 }}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 * (i % 2) }}
                  />
                );
              })}
            </motion.div>
          )}

          {/* split a node into two labelled chunks (scene 3: €56 → €32 reclaimable + €24 stays) */}
          {cfg.split && pos.length > cfg.split.on && frac >= at(cfg.split.at) && (
            <div className="tax-nf-split" style={{ left: pos[cfg.split.on]?.x, top: (pos[cfg.split.on]?.y || 0) + 26 }}>
              {cfg.split.from && (
                <motion.span
                  className="tax-nf-split-from"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: -16 }}
                  transition={{ duration: 0.3 }}
                >
                  {cfg.split.from} <span className="tax-nf-split-arrow">↓</span>
                </motion.span>
              )}
              {cfg.split.into.map((lbl, i) => (
                <motion.span key={i} className={`tax-nf-split-chip ${i === 0 ? "good" : "bad"}`} initial={{ opacity: 0, x: i === 0 ? -18 : 18 }} animate={{ opacity: 1, x: i === 0 ? -26 : 26 }} transition={{ delay: (cfg.split.from ? 0.15 : 0) + i * 0.12, type: "spring", stiffness: 260 }}>{lbl}</motion.span>
              ))}
            </div>
          )}

          {/* annotation chip(s) near a node (per-share calc etc.) */}
          {cfg.note && pos.length > cfg.note.on && frac >= at(cfg.note.at) && (
            <motion.span
              className="tax-nf-note"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              style={{ left: pos[cfg.note.on].x, top: (pos[cfg.note.on].y || 0) - 30 }}
            >
              {cfg.note.text}
            </motion.span>
          )}
          {cfg.notes && cfg.notes.map((nt, i) => pos.length > nt.on && frac >= at(nt.at) && (
            <motion.span
              key={i}
              className="tax-nf-note"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              style={{ left: pos[nt.on].x, top: (pos[nt.on].y || 0) - 30 }}
            >
              {nt.text}
            </motion.span>
          ))}

          {/* big rotated stamp (scene 4: "×2 double taxation") — only for the center-stamp variant (has text) */}
          {cfg.stamp && cfg.stamp.text && rowBox && frac >= at(cfg.stamp.at) && (
            <motion.div
              className="tax-nf-bigstamp"
              initial={{ opacity: 0, scale: 2.4, rotate: -18 }}
              animate={{ opacity: 1, scale: 1, rotate: -10 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
              style={{ left: "50%", top: rowBox.top + (rowBox.bottom - rowBox.top) / 2 }}
            >
              <span className="tax-nf-bigstamp-txt">{cfg.stamp.text}</span>
              {cfg.stamp.sub && <span className="tax-nf-bigstamp-sub">{cfg.stamp.sub}</span>}
            </motion.div>
          )}

          {/* currency swap badge (scene 10: CHF → EUR) */}
          {cfg.swap && pos.length >= 2 && rowBox && frac >= at(cfg.swap.at) && (
            <motion.div className="tax-nf-swap" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} style={{ left: lerp(pos[0]?.x || 0, pos[1]?.x || 0, 0.5), top: rowBox.top - 24 }}>
              <span className="tax-nf-swap-from">{cfg.swap.from}</span>
              <span className="tax-nf-swap-arrow">⇄</span>
              <span className="tax-nf-swap-to">{cfg.swap.to}</span>
            </motion.div>
          )}

          {/* traveling tokens (flat indices, rendered once) */}
          {(cfg.tokens || []).map((tk, i) => {
            if (tk.from >= pos.length || tk.to >= pos.length || !pos[tk.from] || !pos[tk.to]) return null;
            if (frac < at(tk.at)) return null;
            const p = Math.max(0, Math.min(1, (frac - at(tk.at)) / (tk.dur || 0.1)));
            const x = lerp(pos[tk.from].x, pos[tk.to].x, p);
            const y = lerp(pos[tk.from].y, pos[tk.to].y, p);
            const shrunk = tk.shrinkAt != null && frac >= at(tk.shrinkAt);
            const crossing = cfg.border && tk.shrinkAt != null && frac >= at(tk.shrinkAt) && frac < at(tk.shrinkAt) + 0.04;
            // glowing tracer from source to the token's current position (only while moving)
            const dx = x - pos[tk.from].x;
            const dy = y - pos[tk.from].y;
            const len = Math.hypot(dx, dy);
            const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
            return (
              <React.Fragment key={`tk-${i}`}>
                {p > 0 && p < 1 && len > 4 && (
                  <div
                    className="tax-nf-trail"
                    style={{
                      left: pos[tk.from].x,
                      top: pos[tk.from].y,
                      width: len,
                      transform: `rotate(${ang}deg)`,
                    }}
                  />
                )}
                <div
                  className={`tax-nf-token ${tk.match ? "match" : ""} ${crossing ? "crossing" : ""}`}
                  style={{ transform: `translate3d(${x}px,${y}px,0)` }}
                >
                  <motion.div
                    className="tax-nf-token-inner"
                    animate={p >= 1 ? { scale: [1, 1.18, 1] } : { scale: shrunk ? 0.72 : 1, rotate: p > 0 && p < 1 ? [0, -8, 8, 0] : 0 }}
                    transition={p >= 1 ? { duration: 0.4, ease: "easeOut" } : { duration: 0.3, rotate: { duration: 0.6, repeat: p > 0 && p < 1 ? Infinity : 0 } }}
                  >
                    <span className="tax-nf-token-ico">{tk.icon}</span>
                    {tk.label && (
                      <motion.span
                        key={shrunk && tk.shrinkLabel ? "after" : "before"}
                        className="tax-nf-token-label"
                        initial={{ scale: 1.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 16 }}
                      >
                        {shrunk && tk.shrinkLabel ? tk.shrinkLabel : tk.label}
                      </motion.span>
                    )}
                    {tk.match && p >= 1 && (
                      <motion.span className="tax-nf-token-match" initial={{ scale: 0, opacity: 1 }} animate={{ scale: 2.6, opacity: 0 }} transition={{ duration: 0.9, repeat: Infinity }} />
                    )}
                  </motion.div>
                </div>
                {/* arrival effect: money tokens get a "+amount" pop; ✂️ tokens get a red shard burst */}
                {p >= 1 && tk.icon === "💰" && tk.label && (
                  <motion.span
                    className="tax-nf-arrive-chip"
                    initial={{ y: 0, opacity: 0, scale: 0.6 }}
                    animate={{ y: -26, opacity: [0, 1, 0], scale: 1 }}
                    transition={{ duration: 1.4, ease: "easeOut", delay: 0.15 }}
                    style={{ left: pos[tk.to].x, top: pos[tk.to].y }}
                  >
                    +{shrunk && tk.shrinkLabel ? tk.shrinkLabel : tk.label}
                  </motion.span>
                )}
                {p >= 1 && tk.icon === "✂️" && (
                  <div className="tax-nf-cut-burst" style={{ left: pos[tk.to].x, top: pos[tk.to].y }} aria-hidden="true">
                    {[...Array(6)].map((_, i) => {
                      const ang = (i * 60) * Math.PI / 180;
                      return (
                        <motion.span
                          key={i}
                          className="tax-nf-cut-shard"
                          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                          animate={{ x: Math.cos(ang) * 18, y: Math.sin(ang) * 18, opacity: 0, scale: 0.3 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })}

      {/* status pills (scene 10: erstattet / vergütet) */}
      {cfg.pills && (
        <div className="tax-nf-pills">
          {cfg.pills.map((pl, i) => {
            const on = frac >= at(pl.at);
            return (
              <motion.span key={i} className={`tax-nf-pill ${pl.tone || ""} ${on ? "on" : ""}`} animate={{ opacity: on ? 1 : 0.32, scale: on ? 1 : 0.92 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
                <span className="tax-nf-pill-dot" />
                <span className="tax-nf-pill-ico">{pl.tone === "good" ? "✓" : "•"}</span>
                {pl.label}
              </motion.span>
            );
          })}
        </div>
      )}

      {/* sync progress bar — shows how far the narration has played */}
      <div className="tax-nf-progress" aria-hidden="true">
        <motion.div className="tax-nf-progress-fill" style={{ width: `${frac * 100}%` }} />
      </div>
    </motion.div>
  );
}

function FlowDiagram({ flow, hero }) {
  if (!flow) return null;
  const rows = flow.rows || [{ nodes: flow.nodes || [] }];
  return (
    <motion.div
      className={`tax-flow ${hero ? "hero" : ""}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.35 }}
    >
      {rows.map((r, ri) => (
        <div className="tax-flow-row" key={ri}>
          {r.label && <span className="tax-flow-row-label">{r.label}</span>}
          <div className="tax-flow-nodes">
            {r.nodes.map((n, k) => (
              <React.Fragment key={k}>
                <motion.span
                  className={`tax-flow-node ${n.tone ? `tone-${n.tone}` : ""}`}
                  initial={{ opacity: 0, scale: 0.6, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.5 + k * 0.12, type: "spring", stiffness: 280, damping: 20 }}
                >
                  <span className="tax-flow-node-ico">
                    {FLOW_ICON[n.icon] ? <Icon name={FLOW_ICON[n.icon]} /> : <span className="tax-flow-emoji">{n.icon}</span>}
                  </span>
                  <span className="tax-flow-node-label">{n.label}</span>
                </motion.span>
                {k < r.nodes.length - 1 && (
                  <motion.span
                    className="tax-flow-arrow"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + k * 0.12, duration: 0.25 }}
                  >→</motion.span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// ---------- recap scene: summary of all key insights ----------
const RECAP_ORDER = [1, 2, 3, 4, 5, 6, 103, 7, 8, 104, 9, 105, 10, 106];
function Recap({ scene, lang, t }) {
  const d = scene[lang];
  const items = RECAP_ORDER.map((id) => {
    const sc = scenes.find((x) => x.id === id);
    const ins = KEY_INSIGHTS[id];
    if (!sc || !ins) return null;
    return { id, label: sc[lang].bubble, insight: ins[lang], icon: sc.fallback, accent: sc.accent || "#895BB7" };
  }).filter(Boolean);

  return (
    <div className="tax-recap">
      <div className="tax-journey-head">
        <span className="tax-journey-emoji">{scene.fallback}</span>
        <div>
          <h2 className="tax-journey-title">{d.title}</h2>
          <p className="tax-journey-sub">{d.subtitle}</p>
        </div>
        <span className="tax-recap-count">{items.length}</span>
      </div>

      <ol className="tax-recap-list">
        {items.map((it, k) => (
          <motion.li
            key={it.id}
            className="tax-recap-item"
            style={{ borderLeftColor: it.accent }}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.04 * k, duration: 0.3 }}
          >
            <span className="tax-recap-rail" aria-hidden="true">
              <span className="tax-recap-n" style={{ background: it.accent }}>{String(it.id).padStart(2, "0")}</span>
              {k < items.length - 1 && <span className="tax-recap-line" />}
            </span>
            <span className="tax-recap-ico">{it.icon}</span>
            <div className="tax-recap-body">
              <span className="tax-recap-label">{it.label}</span>
              <span className="tax-recap-ins">{it.insight}</span>
            </div>
          </motion.li>
        ))}
      </ol>
      <Narration id={scene.id} lang={lang} replayLabel={t.replay} />
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

// ---------- sort game: assign tasks to Horizon vs RAQUEST ----------
const SORT_BEST_KEY = "tax101_sort_best";
function SortGame({ scene, lang, t, onBack, onFinish }) {
  const d = scene[lang];
  const buckets = d.buckets || [];
  const items = d.items || [];
  const [pool, setPool] = useState(() => shuffle(items.map((_, k) => k)));
  const [assigned, setAssigned] = useState({}); // itemId -> bucketKey
  const [sel, setSel] = useState(null); // selected pool index
  const [status, setStatus] = useState(null);
  const [peek, setPeek] = useState(false);
  const [moves, setMoves] = useState(0);
  const [miss, setMiss] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [flash, setFlash] = useState(null);
  const [live, setLive] = useState(true);
  const [tilt, setTilt] = useState({ rx: 8, ry: -6 });
  const boardRef = useRef(null);
  const [tip, setTip] = useState(null); // {id, text} tooltip
  const [bucketTip, setBucketTip] = useState(null);
  const holdRef = useRef(null);
  const [start, setStart] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [best, setBest] = useState(() => {
    try { return parseInt(localStorage.getItem(SORT_BEST_KEY) || "0", 10) || 0; } catch { return 0; }
  });
  const placed = Object.keys(assigned).length;
  const full = placed === items.length;
  const correctCount = items.filter((it) => assigned[it.id] === it.bucket).length;
  const win = full && correctCount === items.length;

  // timer
  useEffect(() => {
    if (start == null || status === "ok") return;
    const id = setInterval(() => setElapsed(Date.now() - start), 100);
    return () => clearInterval(id);
  }, [start, status]);
  useEffect(() => {
    if (win) {
      const ms = Date.now() - start;
      setElapsed(ms);
      if (best === 0 || ms < best) {
        setBest(ms);
        try { localStorage.setItem(SORT_BEST_KEY, String(ms)); } catch {}
      }
      try {
        const cur = parseInt(localStorage.getItem("tax101_xp") || "0", 10) || 0;
        const gain = 50 + Math.max(0, 30 - miss * 5) + bestCombo * 5;
        localStorage.setItem("tax101_xp", String(cur + gain));
      } catch {}
    }
  }, [win]); // eslint-disable-line

  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  // 3D parallax tilt
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      setTilt({ ry: px * 16, rx: -py * 12 });
    };
    const onLeave = () => setTilt({ rx: 8, ry: -6 });
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave); };
  }, []);

  const assign = (bucketKey) => {
    if (status === "ok" || sel == null) return;
    const idx = sel;
    const it = items[pool[idx]];
    const ok = it.bucket === bucketKey;
    setMoves((m) => m + 1);
    if (start == null) setStart(Date.now());

    if (live) {
      setFlash({ bucketKey, ok });
      setTimeout(() => setFlash(null), 350);
      if (ok) {
        setAssigned((a) => ({ ...a, [it.id]: bucketKey }));
        setPool((p) => p.filter((_, k) => k !== idx));
        setSel(null);
        setStatus(null);
        setCombo((c) => {
          const n = c + 1;
          setBestCombo((b) => Math.max(b, n));
          if (n >= 3 && n % 2 === 1) confetti({ particleCount: 30 + n * 4, spread: 60, origin: { y: 0.4 }, startVelocity: 25 });
          else confetti({ particleCount: 14, spread: 50, origin: { y: 0.45 }, startVelocity: 18, scalar: 0.7 });
          return n;
        });
      } else {
        setMiss((m) => m + 1);
        setCombo(0);
        const tile = document.querySelector(`.tax-game-tile.sel`);
        if (tile) { tile.classList.add("shake-now"); setTimeout(() => tile.classList.remove("shake-now"), 420); }
      }
    } else {
      setAssigned((a) => ({ ...a, [it.id]: bucketKey }));
      setPool((p) => p.filter((_, k) => k !== idx));
      setSel(null);
      setStatus(null);
    }
  };
  const unassign = (itemId) => {
    if (status === "ok") return;
    setAssigned((a) => { const n = { ...a }; delete n[itemId]; return n; });
    setPool((p) => [...p, items.findIndex((x) => x.id === itemId)]);
    setStatus(null);
    setMoves((m) => m + 1);
    setCombo(0);
  };
  const reset = () => {
    setPool(shuffle(items.map((_, k) => k))); setAssigned({}); setSel(null); setStatus(null);
    setMoves(0); setMiss(0); setCombo(0); setBestCombo(0); setStart(null); setElapsed(0); setPeek(false); setFlash(null);
  };
  const check = () => {
    if (!full) return;
    if (win) { setStatus("ok"); confetti({ particleCount: 160, spread: 85, origin: { y: 0.5 } }); }
    else setStatus("no");
  };
  const peekNow = () => {
    if (status === "ok") return;
    setPeek(true);
    setTimeout(() => setPeek(false), 2000);
  };
  const demo = () => {
    if (status === "ok" || pool.length === 0) return;
    const idx = pool[0];
    const it = items[idx];
    setAssigned((a) => ({ ...a, [it.id]: it.bucket }));
    setPool((p) => p.filter((_, k) => k !== 0));
    setSel(null);
    setStatus(null);
    setMoves((m) => m + 1);
    if (start == null) setStart(Date.now());
    setCombo((c) => c + 1);
  };

  const coach = () => {
    if (status === "ok") return lang === "pt" ? "✅ Pronto! Toque em Continuar." : "✅ Done! Tap Continue.";
    if (status === "no") return lang === "pt" ? "✗ Os vermelhos tão errados — toque pra corrigir." : "✗ Red ones are wrong — tap them to fix.";
    if (full) return lang === "pt" ? "✓ Tudo colocado! Toque em Verificar." : "✓ All placed! Tap Check.";
    if (sel != null) return lang === "pt" ? "👇 Toque numa coluna pra soltar o tile." : "👇 Tap a column to drop the tile.";
    return lang === "pt" ? "👆 Toque num tile no topo pra começar." : "👆 Tap a tile at the top to start.";
  };

  const startHold = (it) => {
    if (holdRef.current) clearTimeout(holdRef.current);
    holdRef.current = setTimeout(() => setTip({ id: it.id, text: it.hint }), 450);
  };
  const cancelHold = () => { if (holdRef.current) { clearTimeout(holdRef.current); holdRef.current = null; } };

  const rating = () => {
    if (miss === 0 && elapsed < 30000) return lang === "pt" ? "🧠 Mestre WHT" : "🧠 WHT Master";
    if (elapsed < 40000 && miss <= 2) return lang === "pt" ? "⚡ Rápido e preciso" : "⚡ Fast & sharp";
    if (elapsed < 70000) return lang === "pt" ? "👍 Bem feito" : "👍 Well done";
    return lang === "pt" ? "🌱 No caminho" : "🌱 Getting there";
  };

  return (
    <div className="tax-game tax-sortgame">
      <div className="tax-journey-head">
        <span className="tax-journey-emoji">{scene.fallback}</span>
        <div>
          <h2 className="tax-journey-title">{d.title}</h2>
          <p className="tax-journey-sub">{d.subtitle}</p>
        </div>
      </div>

      {d.process && (
        <div className="tax-sort-process">
          {d.process.map((p) => {
            const placedSteps = new Set(
              items.filter((it) => it.bucket === p.key && assigned[it.id] === it.bucket && it.step).map((it) => it.step)
            );
            const selItem = sel != null ? items[pool[sel]] : null;
            const selStep = selItem && selItem.bucket === p.key ? selItem.step : null;
            return (
            <div key={p.key} className="tax-sort-process-row" style={{ "--bcolor": p.color }}>
              <span className="tax-sort-process-name">{p.name}</span>
              <div className="tax-sort-process-flow">
                {p.steps.map((s, k) => {
                  const covered = placedSteps.has(s);
                  const active = selStep === s;
                  return (
                  <span key={k} className="tax-sort-process-step">
                    <span className={`tax-sort-process-node ${covered ? "covered" : ""} ${active ? "active" : ""}`}>{s}</span>
                    {k < p.steps.length - 1 && <span className="tax-sort-process-arrow">→</span>}
                  </span>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      )}

      <div className="tax-game-stats">
        <span>⏱ {fmt(elapsed)}</span>
        <span>🎯 {moves} {lang === "pt" ? "jogadas" : "moves"}</span>
        <span className={miss > 0 ? "tax-stat-miss" : ""}>✗ {miss}</span>
        {combo >= 2 && <span className="tax-sort-combo">🔥 {combo}x</span>}
        <span>🏆 {best ? fmt(best) : "—"}</span>
        <span className="tax-sort-progress">{placed}/{items.length} {lang === "pt" ? "colocados" : "placed"}</span>
      </div>

      <div className="tax-sort-progressbar">
        <div className="tax-sort-progressbar-fill" style={{ width: `${(placed / items.length) * 100}%` }} />
      </div>

      <div className="tax-sort-mode-row">
        <p className="tax-game-how">
          {live
            ? (lang === "pt" ? "Modo live: o tile só entra se acertar. Errar rebate e quebra o combo." : "Live mode: a tile only drops in if you're right. Wrong bounces back and breaks the combo.")
            : (lang === "pt" ? "Modo strict: coloque tudo e verifique no fim." : "Strict mode: place everything, then check.")}
        </p>
        <button className={`tax-btn mini ${live ? "on" : "ghost"}`} onClick={() => setLive((v) => !v)}>
          {live ? "⚡ Live" : "⚖ Strict"}
        </button>
      </div>

      <div className="tax-sort-coach">
        <span className="tax-coach-step">{coach()}</span>
        <button className="tax-btn mini ghost" onClick={demo} disabled={status === "ok" || pool.length === 0}>
          ✨ {lang === "pt" ? "Demo" : "Demo"}
        </button>
      </div>

      <div className="tax-sort-3d" ref={boardRef}>
        <div className="tax-sort-scene" style={{ transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}>
      {/* pool */}
      <div className="tax-sort-pool">
        {pool.length === 0 ? (
          <span className="tax-game-empty">{lang === "pt" ? "Tudo colocado ✓ — pode verificar" : "All placed ✓ — ready to check"}</span>
        ) : pool.map((idx, k) => {
          const it = items[idx];
          const bIcon = (buckets.find((b) => b.key === it.bucket) || {}).icon;
          return (
            <motion.div
              key={it.id}
              className={`tax-game-tile ${sel === idx ? "sel" : ""} ${peek ? "peek" : ""}`}
              style={{ "--i": k }}
              role="button"
              tabIndex={0}
              onClick={() => setSel(idx)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(idx); } }}
              onMouseDown={() => startHold(it)}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={() => startHold(it)}
              onTouchEnd={cancelHold}
              whileHover={{ y: -3 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="tax-tile-face front">
                <span className="tax-game-tile-ico">{it.icon}</span>
                <span className="tax-game-tile-label">{it.label}</span>
                {it.hint && <span className="tax-tile-info">ⓘ</span>}
              </div>
              <div className="tax-tile-face back">
                <span className="tax-tile-back-ico">{bIcon}</span>
                <span className="tax-tile-back-label">{(buckets.find((b) => b.key === it.bucket) || {}).name}</span>
              </div>
              <span className="tax-tile-shadow" />
              {tip && tip.id === it.id && (
                <div className="tax-tile-tip">{tip.text}</div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* buckets */}
      <div className="tax-sort-buckets">
        {buckets.map((b) => {
          const inBucket = items.filter((it) => assigned[it.id] === b.key);
          const expected = items.filter((it) => it.bucket === b.key).length;
          return (
            <div
              key={b.key}
              className={`tax-sort-bucket ${sel != null ? "active" : ""} ${status === "no" ? "no" : ""} ${status === "ok" ? "win" : ""} ${flash && flash.bucketKey === b.key ? (flash.ok ? "flash-ok" : "flash-no") : ""}`}
              style={{ "--bcolor": b.color }}
              role="button"
              tabIndex={0}
              onClick={() => assign(b.key)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); assign(b.key); } }}
            >
              <div className="tax-sort-bucket-head">
                <span className="tax-sort-bucket-ico">{b.icon}</span>
                <div>
                  <span className="tax-sort-bucket-name">{b.name}</span>
                  <span className="tax-sort-bucket-sub">{b.sub}</span>
                </div>
                {b.info && (
                  <span
                    className="tax-bucket-info"
                    onClick={(e) => { e.stopPropagation(); setBucketTip(bucketTip === b.key ? null : b.key); }}
                    onMouseEnter={() => setBucketTip(b.key)}
                    onMouseLeave={() => setBucketTip(null)}
                  >?</span>
                )}
                <span className="tax-sort-bucket-count">{inBucket.length}<span className="tax-sort-bucket-target">/{expected}</span></span>
              </div>
              {bucketTip === b.key && b.info && (
                <div className="tax-bucket-tip" onClick={(e) => e.stopPropagation()}>{b.info}</div>
              )}
              <div className="tax-sort-bucket-items">
                {sel != null && inBucket.length === 0 && <span className="tax-sort-bucket-empty pulse">{lang === "pt" ? "← solte aqui" : "← drop here"}</span>}
                {inBucket.map((it) => {
                  const right = assigned[it.id] === it.bucket;
                  return (
                    <span key={it.id} className={`tax-sort-chip ${status === "no" ? (right ? "right" : "wrong") : ""} ${status === "ok" ? "right" : ""} ${live ? "live-pop" : ""}`} onClick={(e) => { e.stopPropagation(); unassign(it.id); }}>
                      <span className="tax-sort-chip-ico">{it.icon}</span>
                      {it.label}
                    </span>
                  );
                })}
                {inBucket.length === 0 && sel == null && <span className="tax-sort-bucket-empty">{lang === "pt" ? "solte aqui" : "drop here"}</span>}
              </div>
            </div>
          );
        })}
      </div>
        </div>
      </div>

      {status === "ok" && (
        <motion.div className="tax-game-feedback ok" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
          <span className="tax-feedback-big">✅ {lang === "pt" ? "Tudo no lugar certo!" : "All in the right place!"}</span>
          <span className="tax-feedback-meta">{rating()} · ⏱ {fmt(elapsed)} · 🎯 {moves} · ✗ {miss} · 🔥 {bestCombo}x · +XP</span>
          <div className="tax-sort-recap">
            {buckets.map((b) => (
              <div key={b.key} className="tax-recap-col" style={{ "--bcolor": b.color }}>
                <div className="tax-recap-head"><span>{b.icon}</span> {b.name}</div>
                {items.filter((it) => it.bucket === b.key).map((it) => (
                  <div key={it.id} className="tax-recap-item">
                    <span className="tax-recap-ico">{it.icon}</span>
                    <span className="tax-recap-label">{it.label}</span>
                    <span className="tax-recap-hint">{it.hint}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      )}
      {status === "no" && (
        <motion.div className="tax-game-feedback no" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
          {lang === "pt" ? `Quase! ${correctCount}/${items.length} no lugar certo — os vermelhos tão errados. Toque pra corrigir.` : `Close! ${correctCount}/${items.length} in the right place — the red ones are wrong. Tap to fix.`}
        </motion.div>
      )}

      <div className="tax-flash-nav">
        <button className="tax-btn ghost" onClick={onBack}>‹ {t.back}</button>
        <button className="tax-btn ghost" onClick={reset}>↻ {lang === "pt" ? "Reiniciar" : "Reset"}</button>
        <button className="tax-btn ghost peek" onClick={peekNow} disabled={status === "ok"}>👁 {lang === "pt" ? "Espiar" : "Peek"}</button>
        {status === "ok"
          ? <button className="tax-btn primary" onClick={onFinish}>{lang === "pt" ? "Continuar ›" : "Continue ›"}</button>
          : <button className="tax-btn primary" disabled={!full} onClick={check}>{lang === "pt" ? "Verificar" : "Check"}</button>}
      </div>
      <Narration id={scene.id} lang={lang} replayLabel={t.replay} />
    </div>
  );
}

// ---------- flow game: drag tiles into the correct order ----------
const GAME_ICONS = { 1: "🔍", 2: "🧾", 3: "🖨️", 4: "🏠", 5: "📦", 6: "⏳", 7: "💰", 8: "🏦" };
function FlowGame({ scene, lang, t, onBack, onFinish }) {
  const d = scene[lang];
  const refScene = scenes.find((x) => x.id === (scene.stepsRef || 101));
  const steps = (scene[lang].steps && scene[lang].steps.length) ? scene[lang].steps : (refScene ? refScene[lang].steps : []);
  const correct = [...steps].sort((a, b) => a.n - b.n);
  const [pool, setPool] = useState(() => shuffle(steps.map((_, k) => k)));
  const [order, setOrder] = useState([]);
  const [status, setStatus] = useState(null); // null | "ok" | "no"
  const [moves, setMoves] = useState(0);
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const bestKey = `tax101_game_best_${scene.id}`;
  const [best, setBest] = useState(() => Number(localStorage.getItem(bestKey) || 0));
  const placed = order.length;
  const full = placed === steps.length;
  const win = full && order.every((s, k) => s.n === correct[k].n);

  // timer
  useEffect(() => {
    if (!started || status === "ok") return;
    const id = setInterval(() => setElapsed((e) => e + 100), 100);
    return () => clearInterval(id);
  }, [started, status]);

  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  const bumpMoves = () => { if (!started) setStarted(true); setMoves((m) => m + 1); };

  const moveToOrder = (idx) => {
    if (status === "ok") return;
    setPool((p) => p.filter((_, k) => k !== idx));
    setOrder((o) => [...o, steps[pool[idx]]]);
    setStatus(null); bumpMoves();
  };
  const removeFromOrder = (k) => {
    if (status === "ok") return;
    const s = order[k];
    setOrder((o) => o.filter((_, j) => j !== k));
    setPool((p) => [...p, steps.findIndex((x) => x.n === s.n)]);
    setStatus(null); bumpMoves();
  };
  const moveUp = (k) => { if (k > 0) { setOrder((o) => { const n = [...o]; [n[k-1], n[k]] = [n[k], n[k-1]]; return n; }); bumpMoves(); } };
  const moveDown = (k) => { if (k < order.length - 1) { setOrder((o) => { const n = [...o]; [n[k+1], n[k]] = [n[k], n[k+1]]; return n; }); bumpMoves(); } };
  const reset = () => { setPool(shuffle(steps.map((_, k) => k))); setOrder([]); setStatus(null); setMoves(0); setStarted(false); setElapsed(0); setPeek(false); };
  const [peek, setPeek] = useState(false);
  const peekNow = () => { setPeek(true); setTimeout(() => setPeek(false), 2000); };
  const check = () => {
    if (!full) return;
    if (win) {
      setStatus("ok"); setStarted(false);
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.5 } });
      if (!best || elapsed < best) { setBest(elapsed); try { localStorage.setItem(bestKey, String(elapsed)); } catch {} }
    } else setStatus("no");
  };

  const onDrop = (e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text") || "";
    const [from, idxStr] = data.split(":");
    const idx = Number(idxStr);
    if (from === "pool") moveToOrder(idx);
  };

  return (
    <div className="tax-game">
      <div className="tax-journey-head">
        <span className="tax-journey-emoji">{scene.fallback}</span>
        <div>
          <h2 className="tax-journey-title">{d.title}</h2>
          <p className="tax-journey-sub">{d.subtitle}</p>
        </div>
      </div>

      <div className="tax-game-stats">
        <span className="tax-game-stat"><b>⏱</b> {fmt(elapsed)}</span>
        <span className="tax-game-stat"><b>🎯</b> {moves} {lang === "pt" ? "jogadas" : "moves"}</span>
        <span className="tax-game-stat"><b>🏆</b> {best ? fmt(best) : "—"}</span>
      </div>

      <p className="tax-game-how">
        {lang === "pt"
          ? "Como jogar: toque (ou arraste) um tile do topo pra colocá-lo no próximo slot. Use ▲▼ pra reordenar e ✕ pra tirar. Quando preencher todos, toque em Verificar."
          : "How to play: tap (or drag) a tile from the top to place it in the next slot. Use ▲▼ to reorder and ✕ to remove. When all slots are filled, tap Check."}
      </p>

      {/* peek: preview the correct order (faded) */}
      <AnimatePresence>
        {peek && (
          <motion.div
            className="tax-game-peek"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <span className="tax-game-peek-label">{lang === "pt" ? "Ordem correta" : "Correct order"}:</span>
            <div className="tax-game-peek-row">
              {correct.map((s) => (
                <span key={s.n} className="tax-game-peek-tile">
                  <span className="tax-game-tile-ico">{s.icon || GAME_ICONS[s.n] || "🔹"}</span>
                  <span className="tax-game-tile-n">{s.n}</span>
                  <span className="tax-game-tile-label">{s.title}</span>
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* pool of tiles */}
      <div
        className={`tax-game-pool ${status === "ok" ? "locked" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDrop(e, "pool")}
      >
        {pool.length === 0 ? (
          <span className="tax-game-empty">{lang === "pt" ? "Tudo colocado ✓" : "All placed ✓"}</span>
        ) : pool.map((idx, k) => {
          const s = steps[idx];
          return (
            <motion.div
              key={s.n}
              className="tax-game-tile"
              draggable={status !== "ok"}
              role="button"
              tabIndex={0}
              onClick={() => moveToOrder(k)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); moveToOrder(k); } }}
              onDragStart={(e) => e.dataTransfer.setData("text", `pool:${k}`)}
              whileHover={{ y: -3 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <span className="tax-game-tile-ico">{s.icon || GAME_ICONS[s.n] || "🔹"}</span>
              <span className="tax-game-tile-n">{s.n}</span>
              <span className="tax-game-tile-label">{s.title}</span>
            </motion.div>
          );
        })}
      </div>

      {/* arrow down */}
      <div className="tax-game-arrow">↓</div>

      {/* your order */}
      <div
        className={`tax-game-order ${status === "ok" ? "ok" : ""} ${status === "no" ? "no" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDrop(e, "order")}
      >
        {order.length === 0 ? (
          <span className="tax-game-empty">{lang === "pt" ? "Arraste ou toque nos tiles acima" : "Drag or tap the tiles above"}</span>
        ) : order.map((s, k) => {
          const right = s.n === correct[k].n;
          return (
            <div key={s.n} className={`tax-game-slot ${status === "no" ? (right ? "right" : "wrong") : ""}`}>
              <span className="tax-game-slot-n">{k + 1}</span>
              <span className="tax-game-tile-ico">{s.icon || GAME_ICONS[s.n] || "🔹"}</span>
              <span className="tax-game-tile-label">{s.title}</span>
              {status !== "ok" && (
                <span className="tax-game-slot-ctrl">
                  <button onClick={() => moveUp(k)} disabled={k === 0}>▲</button>
                  <button onClick={() => moveDown(k)} disabled={k === order.length - 1}>▼</button>
                  <button className="tax-game-remove" onClick={() => removeFromOrder(k)}>✕</button>
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* feedback */}
      {status === "ok" && (
        <motion.div className="tax-game-feedback ok" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
          {lang === "pt" ? "✅ Fluxo perfeito! Você montou o Standard Refund na ordem certa." : "✅ Perfect flow! You built the Standard Refund in the right order."}
        </motion.div>
      )}
      {status === "no" && (
        <motion.div className="tax-game-feedback no" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
          {lang === "pt" ? "Quase! Os tiles em vermelho estão no lugar errado — reordena." : "Close! The red tiles are in the wrong spot — reorder."}
        </motion.div>
      )}

      <div className="tax-flash-nav">
        <button className="tax-btn ghost" onClick={onBack}>‹ {t.back}</button>
        <button className="tax-btn ghost" onClick={peekNow} disabled={status === "ok"}>👁 {lang === "pt" ? "Espiar" : "Peek"}</button>
        <button className="tax-btn ghost" onClick={reset}>↻ {lang === "pt" ? "Reiniciar" : "Reset"}</button>
        {status === "ok"
          ? <button className="tax-btn primary" onClick={onFinish}>{lang === "pt" ? "Continuar ›" : "Continue ›"}</button>
          : <button className="tax-btn primary" disabled={!full} onClick={check}>{lang === "pt" ? "Verificar" : "Check"}</button>}
      </div>
      <Narration id={scene.id} lang={lang} replayLabel={t.replay} />
    </div>
  );
}

// ---------- journey scene: connected cards with deliverables ----------
const JOURNEY_PHASES = {
  en: [
    { key: "file", label: "Phase 1 · File & prove", icon: "📝" },
    { key: "wait", label: "Phase 2 · Wait", icon: "⏳" },
    { key: "back", label: "Phase 3 · Money back", icon: "💰" },
  ],
  pt: [
    { key: "file", label: "Fase 1 · Abrir & comprovar", icon: "📝" },
    { key: "wait", label: "Fase 2 · Esperar", icon: "⏳" },
    { key: "back", label: "Fase 3 · Dinheiro de volta", icon: "💰" },
  ],
};

// semantic colors for the canonical status chain — the spine reads as a progression
const STATUS_COLOR = {
  beantragbar: "#4a90d9", // available to claim — blue
  beantragt: "#e6b23c",    // applied, waiting — amber
  erstattet: "#3fb6c8",     // refunded, at the bank — turquoise
  vergütet: "#3fae6b",      // paid out, done — green
};
const JOURNEY_ICONS = { 1: "🔍", 2: "🧾", 3: "🖨️", 4: "🏠", 5: "📦", 6: "⏳", 7: "💰", 8: "🏦" };
function phaseOf(n) { return n <= 5 ? 0 : n === 6 ? 1 : 2; }

function JourneyMap({ scene, lang, t }) {
  const d = scene[lang];
  const phases = JOURNEY_PHASES[lang];
  // canonical status chain (the spine of the domain) — shown as a legend rail
  const chain = ["beantragbar", "beantragt", "erstattet", "vergütet"];

  // group steps under phases
  const grouped = phases.map((p, pi) => ({
    ...p,
    steps: d.steps.filter((st) => phaseOf(st.n) === pi),
  }));

  return (
    <div className="tax-journey">
      <div className="tax-journey-head">
        <span className="tax-journey-emoji">{scene.fallback}</span>
        <div>
          <h2 className="tax-journey-title">{d.title}</h2>
          <p className="tax-journey-sub">{d.subtitle}</p>
        </div>
      </div>

      {/* status-chain rail — the spine of the reclaim lifecycle (color-coded by status) */}
      <div className="tax-j-chain" aria-hidden="true">
        {chain.map((c, k) => (
          <React.Fragment key={c}>
            <span className="tax-j-chain-node">
              <span className="tax-j-chain-dot" style={{ background: STATUS_COLOR[c] || "var(--accent)" }}>{k + 1}</span>
              <span className="tax-j-chain-label" style={{ color: STATUS_COLOR[c] || "var(--turq)" }}>{c}</span>
            </span>
            {k < chain.length - 1 && <span className="tax-j-chain-arrow">→</span>}
          </React.Fragment>
        ))}
      </div>

      <ol className="tax-journey-list tax-j-phases">
        {grouped.map((g, gi) => (
          <li key={g.key} className="tax-j-phase-col">
            <div className="tax-j-phase-head">
              <span className="tax-j-phase-icon">{g.icon}</span>
              <span className="tax-j-phase-label">{g.label}</span>
            </div>
            <div className="tax-j-phase-steps">
              {g.steps.map((st, k) => (
                <motion.div
                  key={st.n}
                  className="tax-j-step"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * k, duration: 0.26 }}
                >
                  <div className="tax-j-rail">
                    <span className="tax-j-n">{st.n}</span>
                    <span className="tax-j-type">{JOURNEY_ICONS[st.n]}</span>
                    {k < g.steps.length - 1 && <span className="tax-j-line" />}
                  </div>
                  <div className="tax-j-body">
                    <div className="tax-j-top">
                      <span className="tax-j-title">{st.title}</span>
                      <span className="tax-j-status" style={STATUS_COLOR[st.status] ? { color: STATUS_COLOR[st.status], background: `color-mix(in srgb, ${STATUS_COLOR[st.status]} 14%, transparent)`, borderColor: `color-mix(in srgb, ${STATUS_COLOR[st.status]} 40%, transparent)` } : undefined}>{st.status}</span>
                    </div>
                    <p className="tax-j-desc">{st.desc}</p>
                    <div className="tax-j-deliv">
                      <span className="tax-j-deliv-label">{t.deliverable}:</span>
                      <span className={`tax-j-deliv-chip ${st.doc ? "doc" : ""}`}>
                        {st.doc && <span className="tax-j-doc-ico">📄</span>}
                        {st.deliverable}
                        {st.doc && <span className="tax-j-doc-tag">{t.physicalDoc}</span>}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            {gi < grouped.length - 1 && <span className="tax-j-phase-arrow" aria-hidden="true">→</span>}
          </li>
        ))}
      </ol>
      <Narration id={scene.id} lang={lang} replayLabel={t.replay} />
    </div>
  );
}

// ---------- module map scene: Phoenix · Horizon · Reporting ----------
function ModuleMap({ scene, lang, t }) {
  const d = scene[lang];
  const flow = lang === "pt"
    ? { from: "Horizon + Phoenix", to: "Reporting", end: "BZSt 🏛️", endSub: "fisco alemão", note: "sem UUID → sem reclaim" }
    : { from: "Horizon + Phoenix", to: "Reporting", end: "BZSt 🏛️", endSub: "German tax office", note: "no UUID → no reclaim" };
  return (
    <div className="tax-map">
      <div className="tax-journey-head">
        <span className="tax-journey-emoji">{scene.fallback}</span>
        <div>
          <h2 className="tax-journey-title">{d.title}</h2>
          <p className="tax-journey-sub">{d.subtitle}</p>
        </div>
      </div>
      <div className="tax-map-grid">
        {d.modules.map((m, k) => (
          <motion.div
            key={m.key}
            className="tax-map-card"
            style={{ "--mcolor": m.color }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * k, duration: 0.3 }}
          >
            <div className="tax-map-head">
              <span className="tax-map-name">{m.name}</span>
              <span className="tax-map-tag">{m.tag}</span>
            </div>
            <p className="tax-map-desc">{m.desc}</p>
            <ul className="tax-map-items">
              {m.items.map((it) => (
                <li key={it}><span className="tax-map-dot" />{it}</li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      {/* data-flow strip: how the pillars connect → BZSt */}
      <motion.div
        className="tax-map-flow"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32, duration: 0.3 }}
      >
        <div className="tax-map-flow-node tax-map-flow-from">
          <span className="tax-map-flow-label">{flow.from}</span>
        </div>
        <span className="tax-map-flow-arrow">→</span>
        <div className="tax-map-flow-node tax-map-flow-mid">
          <span className="tax-map-flow-label">{flow.to}</span>
          <span className="tax-map-flow-sub">MiKaDiv · ELMA · MT 11–19</span>
        </div>
        <span className="tax-map-flow-arrow">→</span>
        <div className="tax-map-flow-node tax-map-flow-end">
          <span className="tax-map-flow-label">{flow.end}</span>
          <span className="tax-map-flow-sub">{flow.endSub}</span>
        </div>
      </motion.div>
      <p className="tax-map-flow-note">⚠ {flow.note}</p>
      <Narration id={scene.id} lang={lang} replayLabel={t.replay} />
    </div>
  );
}
