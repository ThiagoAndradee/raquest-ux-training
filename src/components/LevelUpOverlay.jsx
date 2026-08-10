import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

// Full-screen "LEVEL UP!" moment. Fires confetti + a big animated badge.
// Shown when the learner crosses a level boundary.
export default function LevelUpOverlay({ level, t, onClose }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!level) return;
    const burst = () => {
      const colors = ["#4a90d9", "#3fb6c8", "#e6b23c", "#3fae6b"];
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors });
      setTimeout(
        () => confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors }),
        180
      );
      setTimeout(
        () => confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors }),
        320
      );
    };
    burst();
    const tm = setTimeout(() => close(), 3200);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const close = () => {
    setShow(false);
    setTimeout(() => onClose && onClose(), 220);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="levelup-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="levelup-card"
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 12 }}
          >
            <motion.div
              className="levelup-badge"
              animate={{ scale: [1, 1.12, 1], rotate: [0, 4, -4, 0] }}
              transition={{ duration: 1.1, repeat: Infinity }}
            >
              ⭐
            </motion.div>
            <div className="levelup-eyebrow">{(t && t.levelUp) || "LEVEL UP"}</div>
            <div className="levelup-level">{(t && t.level) || "Level"} {level}</div>
            <div className="levelup-sub">{(t && t.levelUpSub) || "You leveled up — keep going!"}</div>
            <button className="btn primary" onClick={close}>{(t && t.next) || "Continue"} →</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
