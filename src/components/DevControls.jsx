import React, { useState } from "react";

// Floating "prototype controls" panel for development — lets you skip the video timer
// and jump chapters while building/testing. Hidden in production builds.
const DEV = process.env.NODE_ENV !== "production";

export default function DevControls({ remaining, counting, unlocked, onSkip, onSkipVideo, onNext, onPrev, idx, total }) {
  const [open, setOpen] = useState(true);
  if (!DEV) return null;

  const mm = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="dev-controls">
      <button
        className="dev-controls-toggle"
        onClick={() => setOpen((o) => !o)}
        title={open ? "Hide dev controls" : "Show dev controls"}
      >
        {open ? "✕" : "🛠"}
      </button>
      {open && (
        <div className="dev-controls-panel">
          <div className="dev-controls-head">DEV CONTROLS</div>
          <div className="dev-controls-row">
            <span className="dev-controls-state">
              {unlocked ? "unlocked" : counting ? `⏳ ${mm(remaining)}` : "idle"}
            </span>
          </div>
          <div className="dev-controls-row">
            <button className="dev-btn" onClick={onSkip} disabled={unlocked}>
              ⏭ Skip timer
            </button>
          </div>
          <div className="dev-controls-row">
            <button className="dev-btn" onClick={onSkipVideo} disabled={unlocked}>
              ⏭⏭ Skip video
            </button>
          </div>
          <div className="dev-controls-row dev-chapter-nav">
            <button className="dev-btn" onClick={onPrev} disabled={idx === 0}>‹ Prev</button>
            <span className="dev-controls-ch">{idx + 1}/{total}</span>
            <button className="dev-btn" onClick={onNext} disabled={idx >= total - 1}>Next ›</button>
          </div>
        </div>
      )}
    </div>
  );
}
