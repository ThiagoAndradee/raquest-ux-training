import React from "react";
import { motion } from "framer-motion";

export function TopBar({ t, lang, setLang, idx, total, xp, level, levelProgress }) {
  const pct = ((idx + 1) / total) * 100;
  return (
    <header className="topbar">
      <div className="tb-left">
        <span className="tb-logo">RAQUEST</span>
        <span className="tb-course">Erste Schritte</span>
      </div>

      <div className="tb-progress">
        <div className="tb-progress-track">
          <motion.div className="tb-progress-fill" animate={{ width: `${pct}%` }} />
        </div>
        <span className="tb-progress-label">{idx + 1} / {total}</span>
      </div>

      <div className="tb-right">
        <div className="tb-xp" title={`${t.level} ${level}`}>
          <div className="tb-lvl">Lv {level}</div>
          <div className="tb-xp-bar"><motion.div animate={{ width: `${levelProgress}%` }} /></div>
          <div className="tb-xp-val">{xp} {t.xp}</div>
        </div>
        <div className="lang-toggle small">
          <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
          <button className={lang === "pt" ? "on" : ""} onClick={() => setLang("pt")}>PT</button>
        </div>
      </div>
    </header>
  );
}

export function Dots({ total, idx }) {
  return (
    <div className="dots">
      {Array.from({ length: total }).map((_, k) => (
        <span
          key={k}
          className={`dot ${k === idx ? "on" : ""} ${k < idx ? "done" : ""}`}
          aria-label={`Chapter ${k + 1}`}
        />
      ))}
    </div>
  );
}
