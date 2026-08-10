import React from "react";

// Completion certificate shown on the finish screen.
// Print uses window.print() + a print stylesheet that isolates .certificate on paper.
const fmtDate = (lang) =>
  new Date().toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default function Certificate({ name, lang, xp, level, badges, t, meta }) {
  const print = () => window.print();
  return (
    <div className="cert-wrap">
      <div className="certificate">
        <div className="cert-border">
          <div className="cert-seal">🎓</div>
          <div className="cert-brand">RAQUEST</div>
          <div className="cert-course">{meta[lang].title}</div>
          <h2 className="cert-title">{t.certTitle}</h2>
          <p className="cert-certifies">{t.certCertifies}</p>
          <div className="cert-name">{name || "—"}</div>
          <p className="cert-body">{t.certBody}</p>

          <div className="cert-stats">
            <span className="cert-stat">🎮 {xp} {t.xp}</span>
            <span className="cert-stat">⭐ {t.level} {level}</span>
            <span className="cert-stat">🏆 {badges.length} {t.badgesEarned.toLowerCase()}</span>
          </div>

          {badges.length > 0 && (
            <div className="cert-badges">
              {badges.map((b) => (
                <span className="cert-badge" key={b.icon} title={b[lang]}>{b.icon}</span>
              ))}
            </div>
          )}

          <div className="cert-foot">
            <div className="cert-date">
              <div className="cert-date-label">{t.certIssued}</div>
              <div className="cert-date-val">{fmtDate(lang)}</div>
            </div>
            <div className="cert-sign">
              <div className="cert-sign-line" />
              <div className="cert-sign-name">{t.certSignee}</div>
            </div>
          </div>
        </div>
      </div>
      <button className="btn primary" onClick={print}>🖨 {t.print}</button>
    </div>
  );
}
