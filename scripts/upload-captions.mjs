#!/usr/bin/env node
// Gera legendas VTT por segmento (timing reiniciado em 0:00) a partir dos VTTs do vídeo inteiro,
// e sobe como captions no Bunny Stream para cada vídeo mapeado em src/bunny.js.
// Línguas: pt-BR e en. O player do Bunny passa a mostrar o CC toggle nativo.
//
// Uso:
//   node scripts/upload-captions.mjs            # sobe pt-BR + en
//   node scripts/upload-captions.mjs --dry      # só gera e mostra, não sobe
//   node scripts/upload-captions.mjs --lang pt-BR
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const SUBS = path.join(root, "public", "videos", "subs");
const SEGMENTS = path.join(root, "public", "videos", "segments", "segments.json");

const env = {};
const envFile = path.join(root, ".env.local");
if (fs.existsSync(envFile))
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].trim();
  }
const KEY = env.BUNNY_STREAM_KEY;
const LIB = "715897";
if (!KEY) { console.error("BUNNY_STREAM_KEY faltando no .env.local"); process.exit(1); }

const bunny = fs.readFileSync(path.join(root, "src", "bunny.js"), "utf8");
const BUNNY_SEGMENTS = {};
for (const m of bunny.matchAll(/"(\d+-\d+)":\s*"([0-9a-f-]+)"/g)) BUNNY_SEGMENTS[m[1]] = m[2];

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry");
const langs = args.has("--lang") ? [process.argv[process.argv.indexOf("--lang") + 1]] : ["pt", "en"];

const toSec = (ts) => {
  const p = ts.trim().split(":").map(Number);
  if (p.length === 2) return p[0] * 60 + p[1];
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  return 0;
};
const fmt = (sec) => {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec - Math.floor(sec)) * 1000);
  const pad = (n, l) => String(n).padStart(l, "0");
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}.${pad(ms, 3)}`;
};

function parseVtt(text) {
  const cues = [];
  const blocks = text.replace(/\r/g, "").replace(/^WEBVTT.*\n/, "").trim().split(/\n\n+/);
  for (const b of blocks) {
    const lines = b.split("\n");
    const t = lines.shift();
    const mm = t.match(/([\d:.]+)\s*-->\s*([\d:.]+)/);
    if (!mm) continue;
    cues.push({ start: toSec(mm[1]), end: toSec(mm[2]), text: lines.join("\n") });
  }
  return cues;
}

function sliceVtt(fullCues, start, end) {
  const out = [];
  for (const c of fullCues) {
    if (c.end <= start || c.start >= end) continue;
    const ns = Math.max(0, c.start - start);
    const ne = Math.max(ns + 0.001, c.end - start);
    out.push(`${fmt(ns)} --> ${fmt(ne)}\n${c.text}`);
  }
  return "WEBVTT\n\n" + out.join("\n\n") + "\n";
}

const segments = JSON.parse(fs.readFileSync(SEGMENTS, "utf8"));
const vttCache = {};
const loadVtt = (v, lang) => {
  const key = `${v}-${lang}`;
  if (!vttCache[key]) {
    const file = lang === "pt" ? `v${v}-pt.vtt` : `v${v}-en.vtt`;
    vttCache[key] = parseVtt(fs.readFileSync(path.join(SUBS, file), "utf8"));
  }
  return vttCache[key];
};

async function uploadCaption(videoId, srclang, label, vtt) {
  const url = `https://video.bunnycdn.com/library/${LIB}/videos/${videoId}/captions/${srclang}`;
  const body = JSON.stringify({
    srclang,
    label,
    captionsFile: Buffer.from(vtt, "utf8").toString("base64"),
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { AccessKey: KEY, "Content-Type": "application/json" },
    body,
  });
  const txt = await res.text();
  return { ok: res.ok, status: res.status, txt };
}

let done = 0, fail = 0;
for (const seg of segments) {
  const key = `${seg.chapter}-${seg.seg + 1}`;
  const guid = BUNNY_SEGMENTS[key];
  if (!guid) { console.log(`⤳ ${key} sem GUID no Bunny — pulando`); continue; }
  const start = toSec(seg.ss), end = toSec(seg.ee);
  for (const lang of langs) {
    const fullCues = loadVtt(seg.v, lang);
    const vtt = sliceVtt(fullCues, start, end);
    const cueCount = vtt.split("\n\n").length - 1;
    if (cueCount < 1) { console.log(`  ⤳ ${key} ${lang} sem cues — pulando`); continue; }
    const label = lang === "pt" ? "Português" : "English";
    if (DRY) {
      console.log(`[DRY] ${key} ${lang} — ${cueCount} cues, ${vtt.length} bytes`);
      continue;
    }
    const r = await uploadCaption(guid, lang, label, vtt);
    if (r.ok) { done++; console.log(`  ✓ ${key} ${lang} (${r.status})`); }
    else { fail++; console.log(`  ✗ ${key} ${lang} (${r.status}) ${r.txt.slice(0, 120)}`); }
  }
}
console.log(`\n${DRY ? "DRY-RUN" : "Upload"}: ${done} ok, ${fail} falha.`);
if (!DRY) console.log("Recarregue o app — o player do Bunny agora mostra o CC toggle.");
