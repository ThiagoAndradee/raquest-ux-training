// Regenerates the Tax101 narration audio from dubbing/tax-narration.json so the
// spoken narration matches the on-screen karaoke lyrics exactly.
//
// Uses edge-tts (via the system python3 that has it installed).
//
// Usage:
//   node dubbing/gen-tax-audio.mjs            # regenerate ALL scenes, both langs
//   node dubbing/gen-tax-audio.mjs 2          # only scene id 2, both langs
//   node dubbing/gen-tax-audio.mjs 2 3 en     # scenes 2 and 3, english only
//
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { spawnSync } from "child_process";

const PYTHON = "/usr/bin/python3"; // has edge_tts installed
const data = JSON.parse(readFileSync("dubbing/tax-narration.json", "utf8"));
let entries = data.entries;

const args = process.argv.slice(2);
const ids = args.filter((a) => /^\d+$/.test(a)).map(Number);
const langFilter = args.find((a) => a === "en" || a === "pt");
if (ids.length) entries = entries.filter((e) => ids.includes(e.id));
if (langFilter) entries = entries.filter((e) => e.lang === langFilter);

console.log(`▶ regenerating ${entries.length} audio file(s)...`);
let ok = 0, fail = 0;
for (const e of entries) {
  const tmp = `/tmp/tax-tts-${e.id}-${e.lang}.txt`;
  writeFileSync(tmp, e.text, "utf8");
  const res = spawnSync(PYTHON, [
    "-m", "edge_tts",
    "-v", e.voice,
    "-f", tmp,
    "--write-media", e.out,
  ], { stdio: "inherit" });
  try { unlinkSync(tmp); } catch {}
  if (res.status === 0 && existsSync(e.out)) {
    ok++;
    console.log(`  ✓ tax-${e.id}-${e.lang}.mp3`);
  } else {
    fail++;
    console.log(`  ✗ FAILED tax-${e.id}-${e.lang}.mp3 (exit ${res.status})`);
  }
}
console.log(`\n✓ done — ${ok} ok, ${fail} failed`);
if (fail) process.exit(1);
