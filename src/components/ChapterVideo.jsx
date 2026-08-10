import React, { useEffect, useRef } from "react";
import { bunnyIdFor, bunnyUrl } from "../bunny";

// The real training video, at the top of each chapter (right below the title).
// - If the active segment is on Bunny Stream → embed via iframe (Bunny's player) + Player.js bridge.
// - Otherwise → local <video> (full training file) cued to the segment's start, with native subtitles.
// `activeSeg` is the index (0-based) of the segment currently shown; the chips below call setActiveSeg to switch it.
//
// Bunny end-detection: the iframe posts `ended` via Player.js (postMessage bridge).
// We load the Player.js lib once, instantiate `playerjs.Player(iframe)`, and on `ended` → onEnded().
// `playToken` (from the gate button) commands the player to start playing.
const PLAYERJS_SRC = "https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js";

function loadPlayerJs() {
  return new Promise((resolve) => {
    if (window.playerjs) return resolve();
    const existing = document.querySelector(`script[src="${PLAYERJS_SRC}"]`);
    if (existing) {
      if (window.playerjs) return resolve();
      existing.addEventListener("load", () => resolve());
      return;
    }
    const s = document.createElement("script");
    s.src = PLAYERJS_SRC;
    s.async = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

export function toSec(ts) {
  const parts = String(ts).split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export default function ChapterVideo({ video, lang, chapterIdx, activeSeg, setActiveSeg, onEnded, onPlay, paused }) {
  const localRef = useRef(null);
  const iframeRef = useRef(null);
  const bunnyPlayerRef = useRef(null);
  const seg = video[activeSeg] || video[0];
  const segOneBased = (activeSeg ?? 0) + 1;
  const bunnyId = bunnyIdFor(chapterIdx, segOneBased);

  // keep latest callbacks without re-running the player init effect
  const onEndedRef = useRef(onEnded);
  const onPlayRef = useRef(onPlay);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);
  useEffect(() => { onPlayRef.current = onPlay; }, [onPlay]);

  // local fallback: seek the full video to the active segment's start whenever it changes
  useEffect(() => {
    if (bunnyId) return; // iframe handles its own playback
    const v = localRef.current;
    if (!v) return;
    const start = toSec(seg.ss);
    const seek = () => { try { v.currentTime = start; } catch (e) {} };
    if (v.readyState >= 1) seek();
    else v.addEventListener("loadedmetadata", seek, { once: true });
  }, [seg.ss, bunnyId, activeSeg]);

  // local fallback: turn on the subtitle track matching the app language on load
  // (some browsers don't honor `default` on <track>, so we force it via TextTrack.mode)
  useEffect(() => {
    if (bunnyId) return;
    const v = localRef.current;
    if (!v) return;
    const enable = () => {
      const tracks = v.textTracks;
      for (let k = 0; k < tracks.length; k++) {
        const tk = tracks[k];
        tk.mode = tk.language === lang ? "showing" : "disabled";
      }
    };
    if (v.readyState >= 1) enable();
    else v.addEventListener("loadedmetadata", enable, { once: true });
  }, [bunnyId, lang, activeSeg]);

  // Bunny: init Player.js bridge + listen for `ended` / `play`
  useEffect(() => {
    if (!bunnyId) return;
    let cancelled = false;
    loadPlayerJs().then(() => {
      if (cancelled || !iframeRef.current || !window.playerjs) return;
      try {
        const player = new window.playerjs.Player(iframeRef.current);
        bunnyPlayerRef.current = player;
        // register directly (not nested in `ready`) — if `ready` already fired,
        // nesting would miss the event and the real timer would never start.
        player.on("ended", () => { onEndedRef.current && onEndedRef.current(); });
        player.on("play", () => { onPlayRef.current && onPlayRef.current(); });
        // fallback: `timeupdate` fires repeatedly once playing — starts the
        // timer even if the `play` event never reaches us (the real bug).
        player.on("timeupdate", () => { onPlayRef.current && onPlayRef.current(); });
      } catch (e) { /* bridge not available — manual gate still works */ }
    });
    return () => {
      cancelled = true;
      try { bunnyPlayerRef.current && bunnyPlayerRef.current.destroy && bunnyPlayerRef.current.destroy(); } catch (e) {}
      bunnyPlayerRef.current = null;
    };
  }, [bunnyId]);

  // pause the video once the deck overlays it (so audio doesn't keep playing behind)
  useEffect(() => {
    if (!paused) return;
    if (bunnyId) {
      try { bunnyPlayerRef.current && bunnyPlayerRef.current.pause && bunnyPlayerRef.current.pause(); } catch (e) {}
    } else {
      try { localRef.current && localRef.current.pause(); } catch (e) {}
    }
  }, [paused, bunnyId]);

  const subs = (lg) => `${process.env.PUBLIC_URL}/videos/subs/v${seg.v}-${lg}.vtt`;

  return (
    <div className="chvideo">
      {bunnyId ? (
        <iframe
          ref={iframeRef}
          className="chvideo-iframe"
          src={bunnyUrl(bunnyId, lang)}
          title={seg.label}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
        />
      ) : (
        <video
          ref={localRef}
          src={`${process.env.PUBLIC_URL}/videos/v${seg.v}.mp4`}
          controls
          preload="metadata"
          playsInline
          onPlay={onPlay}
          onEnded={onEnded}
        >
          <track kind="subtitles" src={subs("pt")} srclang="pt" label="Português" default={lang === "pt"} />
          <track kind="subtitles" src={subs("en")} srclang="en" label="English" default={lang === "en"} />
          <track kind="subtitles" src={subs("de")} srclang="de" label="Deutsch" />
        </video>
      )}

      <div className="chvideo-meta">
        <span className="chvideo-range">V{seg.v} · {seg.ss}–{seg.ee}</span>
        {bunnyId ? (
          <span className="chvideo-hint">
            {lang === "pt" ? "Clip no Bunny Stream" : "Bunny Stream clip"}
          </span>
        ) : (
          <span className="chvideo-hint">
            {lang === "pt"
              ? "Vídeo de treino real · posicionado no trecho deste capítulo"
              : "Real training video · cued to this chapter's section"}
          </span>
        )}
      </div>

      {/* segment chips — switch the active segment shown in the player above */}
      {video.length > 1 && setActiveSeg && (
        <div className="vref-segs vref-segs--inline">
          {video.map((s, i) => (
            <button
              type="button"
              className={`vref-seg${activeSeg === i ? " on" : ""}`}
              key={i}
              onClick={() => setActiveSeg(i)}
              title={lang === "pt" ? "Mostrar este trecho no player acima" : "Show this section in the player above"}
            >
              <span className="vref-badge">V{s.v}</span>
              <span className="vref-time">{s.ss}–{s.ee}</span>
              <span className="vref-label">{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
