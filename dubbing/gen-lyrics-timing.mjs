// Builds precise per-line karaoke timings for GlobalLyrics by using edge-tts word-level
// subtitles. The on-screen karaoke lines are derived FROM the spoken cues, so the
// displayed text always matches the narration and the active line tracks the real
// audio currentTime (no more linear 6-word guessing).
//
// Output: src/tax101/lyrics-timing.json  ->  { id: { en: [{line, start, end}, ...], pt: [...] } }
//
// Run: node dubbing/gen-lyrics-timing.mjs            # all narrative scenes, both langs
//       node dubbing/gen-lyrics-timing.mjs 1 en       # scene 1, english only
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { spawnSync } from "child_process";

const PYTHON = "/usr/bin/python3";
const data = JSON.parse(readFileSync("dubbing/tax-narration.json", "utf8"));
let entries = data.entries;

const args = process.argv.slice(2);
const ids = args.filter((a) => /^\d+$/.test(a)).map(Number);
const langFilter = args.find((a) => a === "en" || a === "pt");
if (ids.length) entries = entries.filter((e) => ids.includes(e.id));
if (langFilter) entries = entries.filter((e) => e.lang === langFilter);

function toSec(t) {
  const m = t.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000;
}
function parseVTT(path) {
  const txt = readFileSync(path, "utf8");
  const cues = [];
  const blocks = txt.split(/\n\s*\n/);
  for (const b of blocks) {
    const m = b.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*\n([\s\S]*)/);
    if (!m) continue;
    cues.push({ start: toSec(m[1]), end: toSec(m[2]), text: m[3].replace(/\s+/g, " ").trim() });
  }
  return cues;
}

console.log(`▶ building lyrics timing for ${entries.length} entry/entries...`);
const out = {};
let ok = 0, fail = 0;
for (const e of entries) {
  const tmpTxt = `/tmp/tax-lyrics-${e.id}-${e.lang}.txt`;
  const tmpVtt = `/tmp/tax-lyrics-${e.id}-${e.lang}.vtt`;
  writeFileSync(tmpTxt, e.text, "utf8");
  // generate audio (so timings match the real file) + word-level subtitles
  const res = spawnSync(PYTHON, [
    "-m", "edge_tts",
    "-v", e.voice,
    "-f", tmpTxt,
    "--write-media", e.out,
    "--write-subtitles", tmpVtt,
  ], { stdio: "inherit" });
  try { unlinkSync(tmpTxt); } catch {}
  if (res.status !== 0 || !existsSync(tmpVtt) || !existsSync(e.out)) {
    fail++;
    console.log(`  ✗ FAILED tax-${e.id}-${e.lang}`);
    try { unlinkSync(tmpVtt); } catch {}
    continue;
  }
  const cues = parseVTT(tmpVtt);
  try { unlinkSync(tmpVtt); } catch {}
  // edge-tts subtitles are sentence-level: one cue = one karaoke line, with real start/end times
  const lines = cues.map((c) => ({ line: c.text, start: c.start, end: c.end }));
  (out[e.id] = out[e.id] || {})[e.lang] = lines;
  ok++;
  console.log(`  ✓ tax-${e.id}-${e.lang}  (${lines.length} lines, ${lines[0]?.start.toFixed(2)}s…${lines[lines.length - 1]?.end.toFixed(2)}s)`);
}
writeFileSync("src/tax101/lyrics-timing.json", JSON.stringify(out, null, 0), "utf8");
console.log(`\n✓ done — ${ok} ok, ${fail} failed → src/tax101/lyrics-timing.json`);
if (fail) process.exit(1);
