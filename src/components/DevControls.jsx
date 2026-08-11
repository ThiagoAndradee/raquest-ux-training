import React, { useState } from "react";

// Floating "prototype controls" panel for development — jump chapters while
// building/testing. Hidden in production builds. The video gate/timer was
// removed, so there's nothing to skip anymore.
const DEV = process.env.NODE_ENV !== "production";

export default function DevControls({ unlocked, onNext, onPrev, idx, total }) {
  const [open, setOpen] = useState(true);
  if (!DEV) return null;

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
            <span className="dev-controls-state">{unlocked ? "unlocked" : "idle"}</span>
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
