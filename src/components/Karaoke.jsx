import React, { useState, useEffect, useRef, useCallback } from "react";
import { KARAOKE_TRACKS } from "./karaokeTracks";

const LS_TIMINGS = (id) => `raquest_karaoke_times_${id}`;
const LS_LYRICS = (id) => `raquest_karaoke_lyrics_${id}`;

function loadTimes(id, n, fallback) {
  try {
    const raw = localStorage.getItem(LS_TIMINGS(id));
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch {}
  // fallback: baked timings from the track (e.g. whisper-derived), else nulls
  if (Array.isArray(fallback) && fallback.length === n) return fallback.slice();
  return new Array(n).fill(null);
}
function saveTimes(id, arr) {
  try { localStorage.setItem(LS_TIMINGS(id), JSON.stringify(arr)); } catch {}
}
function loadLyrics(id, fallback) {
  try {
    const raw = localStorage.getItem(LS_LYRICS(id));
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}
function saveLyrics(id, arr) {
  try { localStorage.setItem(LS_LYRICS(id), JSON.stringify(arr)); } catch {}
}

function fmt(s) {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

export default function Karaoke({ initialLang, onExit }) {
  const [lang] = useState(initialLang || "pt");
  const [trackIdx, setTrackIdx] = useState(0);
  const track = KARAOKE_TRACKS[trackIdx];

  const [lyrics, setLyrics] = useState(() => loadLyrics(track.id, track.lyrics));
  const [times, setTimes] = useState(() => loadTimes(track.id, track.lyrics.length, track.times));
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [syncMode, setSyncMode] = useState(false);
  const [syncPtr, setSyncPtr] = useState(0); // next line to mark in sync mode
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

  const audioRef = useRef(null);
  const lineRefs = useRef([]);

  // non-empty line indices for display
  const lines = lyrics;
  const lineCount = lines.length;

  // current line index based on times (last line whose time <= cur)
  const activeLine = (() => {
    if (syncMode) return syncPtr;
    let a = -1;
    for (let i = 0; i < lineCount; i++) {
      const t = times[i];
      if (t != null && t <= cur + 0.15) a = i;
    }
    if (a === -1 && cur > 0) {
      // fallback even distribution
      a = Math.min(lineCount - 1, Math.floor((cur / (dur || 1)) * lineCount));
    }
    return a;
  })();

  // load track on change
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    setPlaying(false);
    setCur(0);
    setSyncMode(false);
    setSyncPtr(0);
    setLyrics(loadLyrics(track.id, track.lyrics));
    setTimes(loadTimes(track.id, track.lyrics.length, track.times));
  }, [trackIdx]); // eslint-disable-line

  // when lyrics change (track switch / edit save), resize times array
  useEffect(() => {
    setTimes((prev) => {
      const next = new Array(lines.length).fill(null);
      for (let i = 0; i < Math.min(prev.length, next.length); i++) next[i] = prev[i];
      return next;
    });
  }, [lyrics]); // eslint-disable-line

  // audio events
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onMeta = () => setDur(a.duration || 0);
    const onTime = () => { if (!syncMode) setCur(a.currentTime); };
    const onEnd = () => setPlaying(false);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, [trackIdx, syncMode]);

  // auto-scroll active line into view
  useEffect(() => {
    const el = lineRefs.current[activeLine];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeLine]);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().catch(() => {}); setPlaying(true); }
  }, [playing]);

  const seek = (t) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(dur || 0, t));
    setCur(t);
  };

  // tap-to-sync: mark current line's start = current playback time, advance pointer
  const markLine = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    const t = a.currentTime;
    setTimes((prev) => {
      const next = prev.slice();
      next[syncPtr] = t;
      saveTimes(track.id, next);
      return next;
    });
    setSyncPtr((p) => Math.min(lineCount, p + 1));
  }, [syncPtr, lineCount, track.id]);

  // keyboard: space = play/pause (or mark in sync mode), arrows = seek
  useEffect(() => {
    const onKey = (e) => {
      if (editing) return;
      const a = audioRef.current;
      if (e.code === "Space") {
        e.preventDefault();
        if (syncMode) markLine(); else togglePlay();
      } else if (e.code === "ArrowRight" && a) {
        a.currentTime = Math.min(dur || 0, a.currentTime + 5); setCur(a.currentTime);
      } else if (e.code === "ArrowLeft" && a) {
        a.currentTime = Math.max(0, a.currentTime - 5); setCur(a.currentTime);
      } else if (e.code === "Escape" && syncMode) {
        setSyncMode(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [syncMode, togglePlay, markLine, editing, dur]);

  const clickLine = (i) => {
    if (syncMode) { setSyncPtr(i); return; }
    const t = times[i];
    if (t != null) seek(t);
  };

  const startEdit = () => {
    setEditText(lines.join("\n"));
    setEditing(true);
  };
  const saveEdit = () => {
    const arr = editText.split("\n");
    setLyrics(arr);
    saveLyrics(track.id, arr);
    setEditing(false);
  };
  const resetTimes = () => {
    if (!window.confirm("Restaurar os tempos originais (whisper) desta faixa?")) return;
    const base = (Array.isArray(track.times) && track.times.length === lineCount)
      ? track.times.slice()
      : new Array(lineCount).fill(null);
    setTimes(base);
    saveTimes(track.id, base);
    setSyncPtr(0);
  };
  const resetLyrics = () => {
    if (!window.confirm("Restaurar a letra original desta faixa?")) return;
    setLyrics(track.lyrics);
    saveLyrics(track.id, track.lyrics);
    const base = (Array.isArray(track.times) && track.times.length === track.lyrics.length)
      ? track.times.slice()
      : new Array(track.lyrics.length).fill(null);
    setTimes(base);
    saveTimes(track.id, base);
  };

  const markedCount = times.filter((t) => t != null).length;
  const progress = dur ? (cur / dur) * 100 : 0;

  return (
    <div className="karaoke">
      <div className="karaoke-top">
        <button className="btn ghost" onClick={onExit}>← {lang === "pt" ? "Voltar" : "Back"}</button>
        <div className="karaoke-title">
          <span className="karaoke-badge">🎤 KARAOKE</span>
          <h1>{track.title}</h1>
          <p>{track.sub}</p>
        </div>
        <div className="karaoke-track-tabs">
          {KARAOKE_TRACKS.map((tk, i) => (
            <button
              key={tk.id}
              className={`karaoke-tab ${i === trackIdx ? "on" : ""}`}
              onClick={() => setTrackIdx(i)}
              title={tk.sub}
            >{tk.title}</button>
          ))}
        </div>
      </div>

      <div className="karaoke-body">
        <div className="karaoke-lyrics">
          {editing ? (
            <textarea
              className="karaoke-edit"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
              spellCheck={false}
            />
          ) : (
            lines.map((ln, i) => {
              const isActive = i === activeLine;
              const isMarked = times[i] != null;
              const isSyncNext = syncMode && i === syncPtr;
              if (ln === "") {
                return <div key={i} className="karaoke-line-blank" ref={(el) => { lineRefs.current[i] = el; }} />;
              }
              return (
                <button
                  key={i}
                  ref={(el) => { lineRefs.current[i] = el; }}
                  className={`karaoke-line ${isActive ? "active" : ""} ${isSyncNext ? "sync-next" : ""} ${isMarked ? "marked" : ""}`}
                  onClick={() => clickLine(i)}
                >
                  <span className="karaoke-line-idx">{isMarked ? fmt(times[i]) : (syncMode && isSyncNext ? "●" : "")}</span>
                  <span className="karaoke-line-txt">{ln}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="karaoke-side">
          <div className="karaoke-progress" onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            seek(((e.clientX - r.left) / r.width) * (dur || 0));
          }}>
            <div className="karaoke-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="karaoke-time">
            <span>{fmt(cur)}</span>
            <span>{fmt(dur)}</span>
          </div>

          <div className="karaoke-controls">
            <button className="btn primary big" onClick={togglePlay}>
              {playing ? "❚❚" : "▶"}
            </button>
            <button className="btn ghost" onClick={() => seek(cur - 10)}>⟲ 10</button>
            <button className="btn ghost" onClick={() => seek(cur + 10)}>10 ⟳</button>
          </div>

          <div className="karaoke-sync-box">
            <div className="karaoke-sync-head">
              <span>{lang === "pt" ? "Modo de sincronização" : "Sync mode"}</span>
              <button
                className={`karaoke-sync-toggle ${syncMode ? "on" : ""}`}
                onClick={() => { setSyncMode((s) => !s); setSyncPtr(0); }}
              >{syncMode ? (lang === "pt" ? "ATIVO" : "ON") : (lang === "pt" ? "ativar" : "off")}</button>
            </div>
            <p className="karaoke-sync-hint">
              {syncMode
                ? (lang === "pt"
                    ? "Dê play e aperte ESPAÇO (ou toque em Marcar) no começo de cada linha. Os tempos salvam sozinhos."
                    : "Press play, then hit SPACE (or tap Mark) at the start of each line. Times auto-save.")
                : (lang === "pt"
                    ? "Ative pra gravar o tempo de cada linha enquanto toca. Depois, tocar numa linha busca o áudio."
                    : "Turn on to record each line's time as it plays. Then tapping a line seeks the audio.")}
            </p>
            {syncMode && (
              <button className="btn primary karaoke-mark-btn" onClick={markLine}>
                ● {lang === "pt" ? "Marcar linha" : "Mark line"} ({syncPtr}/{lineCount})
              </button>
            )}
            <div className="karaoke-sync-stats">
              <span>{lang === "pt" ? "Marcadas" : "Marked"}: {markedCount}/{lineCount}</span>
              <button className="karaoke-link" onClick={resetTimes}>{lang === "pt" ? "limpar tempos" : "clear times"}</button>
            </div>
          </div>

          <div className="karaoke-edit-box">
            {editing ? (
              <>
                <button className="btn primary" onClick={saveEdit}>{lang === "pt" ? "Salvar letra" : "Save lyrics"}</button>
                <button className="btn ghost" onClick={() => setEditing(false)}>{lang === "pt" ? "Cancelar" : "Cancel"}</button>
              </>
            ) : (
              <>
                <button className="btn ghost" onClick={startEdit}>✎ {lang === "pt" ? "Editar letra" : "Edit lyrics"}</button>
                <button className="karaoke-link" onClick={resetLyrics}>{lang === "pt" ? "restaurar original" : "reset original"}</button>
              </>
            )}
          </div>
        </div>
      </div>

      <audio ref={audioRef} src={track.src} preload="metadata" />
    </div>
  );
}
