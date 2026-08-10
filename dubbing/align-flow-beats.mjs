// Aligns NarrFlow beat timings to the REAL spoken moments in the narration audio.
// For each flagship scene + lang, regenerates audio + subtitles via edge-tts,
// finds the cue containing each key trigger phrase, and converts its start time
// into a fraction of the total audio duration. Writes dubbing/flow-beats-aligned.json.
//
// Run: node dubbing/align-flow-beats.mjs
import { readFileSync, writeFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";

const PYTHON = "/usr/bin/python3";
const data = JSON.parse(readFileSync("dubbing/tax-narration.json", "utf8"));

// trigger phrase per beat, per scene. The phrase is matched (case-insensitive, ignoring
// punctuation) against the subtitle cue text; the cue's start time becomes the beat's `at`.
const PHRASES = {
  1: {
    reveal0: { en: "lets start simple", pt: "vamos comecar simples" },
    token:   { en: "the money crosses a border", pt: "o dinheiro cruza uma fronteira" },
    cut:     { en: "the foreign country takes its tax", pt: "o pais estrangeiro cobra o imposto" },
  },
  2: {
    reveal0: { en: "share their profit", pt: "dividem o lucro" },
    token0:  { en: "share their profit with you", pt: "dividem o lucro com voce" },
    reveal1: { en: "called a dividend", pt: "chama dividendo" },
    token1:  { en: "hundred and sixty euros", pt: "cento e sessenta euros" },
    reveal2: { en: "your dividend", pt: "seu dividendo" },
  },
  3: {
    reveal0: { en: "before the dividend reaches you", pt: "antes do dividendo chegar ate voce" },
    reveal1: { en: "switzerland withholds thirty-five percent", pt: "a suica retem trinta e cinco por cento" },
    token:   { en: "only a hundred and four reach you", pt: "so cento e quatro chegam ate voce" },
    split:   { en: "about thirty-two euros is reclaimable", pt: "cerca de trinta e dois euros e reclamavel" },
  },
  4: {
    reveal0: { en: "here's the catch", pt: "tem o problema" },
    reveal1: { en: "tax that same dividend", pt: "taxar esse mesmo dividendo" },
    reveal2: { en: "tax that same dividend again", pt: "taxar esse mesmo dividendo de novo" },
    reveal3: { en: "double taxation", pt: "bitributacao" },
    token0:  { en: "tax that same dividend", pt: "taxar esse mesmo dividendo" },
    token1:  { en: "double taxation", pt: "bitributacao" },
  },
  5: {
    reveal0: { en: "prevent double taxation", pt: "evitar a bitributacao" },
    reveal1: { en: "double-taxation treaty", pt: "acordo de bitributacao" },
    reveal2: { en: "cap on what the source", pt: "teto pro que o pais" },
    reveal3: { en: "twenty percent can come back", pt: "vinte por cento pode voltar" },
    reveal4: { en: "domestic law can override", pt: "lei interna pode sobrepor" },
  },
  6: {
    reveal0: { en: "standard refund", pt: "standard refund" },
    reveal1: { en: "quick refund", pt: "quick refund" },
    reveal2: { en: "relief-at-source", pt: "relief-at-source" },
  },
  7: {
    reveal0: { en: "take the standard refund", pt: "pega o standard refund" },
    token0:  { en: "file an application", pt: "abre uma aplicacao" },
    stamp:   { en: "unique tracking number", pt: "numero unico de rastreio" },
    token1:  { en: "matched back to this application", pt: "casado de volta com essa aplicacao" },
  },
  8: {
    reveal0: { en: "the print process", pt: "processo de impressao" },
    reveal1: { en: "official form", pt: "formulario oficial" },
    reveal2: { en: "letter to your local tax office", pt: "carta ao seu fisco local" },
    reveal3: { en: "residence certificate", pt: "certificado de residencia" },
    reveal4: { en: "second druckprozess", pt: "segundo druckprozess" },
    token0:  { en: "letter to your local tax office", pt: "carta ao seu fisco local" },
  },
  103: {
    reveal0: { en: "travel through a custody chain", pt: "passam por uma cadeia de custodia" },
    reveal1: { en: "central securities depository", pt: "depositario central" },
    reveal2: { en: "the custodian is the lagerstelle", pt: "custodiante e a lagerstelle" },
    reveal3: { en: "then your bank", pt: "depois seu banco" },
    reveal4: { en: "then you", pt: "depois voce" },
    link:    { en: "lagerstellennummer that links", pt: "lagerstellennummer que liga" },
  },
  104: {
    reveal0: { en: "with vollmacht, the bank is authorised", pt: "com vollmacht, o banco ta autorizado" },
    reveal1: { en: "without vollmacht, the documents", pt: "sem vollmacht, os documentos" },
    token0:  { en: "go to the client first", pt: "ir pro cliente assinar primeiro" },
  },
  105: {
    reveal0: { en: "thirty-six months", pt: "trinta e seis meses" },
    reveal1: { en: "three years", pt: "tres anos" },
    reveal2: { en: "sixty months", pt: "sessenta meses" },
    reveal3: { en: "warning period", pt: "periodo de aviso" },
    reveal4: { en: "becomes verjhart", pt: "vira verjahrt" },
    reveal5: { en: "gone forever", pt: "acabou" },
    token0:  { en: "becomes verjhart", pt: "vira verjahrt" },
    token1:  { en: "gone forever", pt: "acabou" },
  },
  106: {
    reveal0: { en: "runs all this", pt: "roda tudo" },
    reveal1: { en: "the bank", pt: "o banco" },
    reveal2: { en: "volume-based fee", pt: "fee por volume" },
    reveal3: { en: "success fee", pt: "success fee" },
    reveal4: { en: "passes the rest to you", pt: "repassa o resto" },
    token0:  { en: "the bank", pt: "o banco" },
    token1:  { en: "volume-based fee", pt: "fee por volume" },
    token2:  { en: "success fee", pt: "success fee" },
    token3:  { en: "passes the rest to you", pt: "repassa o resto" },
  },
  10: {
    token0: { en: "the money returns", pt: "o dinheiro volta" },
    match:  { en: "auto-matches it back", pt: "casa ele de volta" },
    swap:   { en: "the exchange rate", pt: "a taxa de cambio" },
    pill0:  { en: "status becomes erstattet", pt: "status vira erstattet" },
    token1: { en: "bank deducts its fee", pt: "banco desconta a fee" },
    pill1:  { en: "status is vergutet", pt: "status e vergutet" },
  },
};

const FLAG = [1, 2, 3, 4, 5, 6, 7, 8, 103, 104, 105, 106, 10];

function parseVTT(path) {
  const txt = readFileSync(path, "utf8");
  const cues = [];
  const blocks = txt.split(/\n\s*\n/);
  for (const b of blocks) {
    const m = b.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*\n([\s\S]*)/);
    if (!m) continue;
    cues.push({ start: toSec(m[1]), end: toSec(m[2]), text: m[3].trim() });
  }
  return cues;
}
function toSec(t) {
  const m = t.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000;
}
function norm(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents (ü→u, é→e, ç→c)
    .replace(/[''`]/g, "")                         // drop apostrophes (don't turn into space)
    .replace(/[.,;:!?—–\-"()]/g, " ")              // other punctuation → space
    .replace(/\s+/g, " ").trim();
}
// significant words (len>=4 or numeric) — used for robust keyword matching
function keywords(phrase) {
  return norm(phrase).split(" ").filter((w) => w.length >= 4 || /^\d+$/.test(w));
}
function findStart(cues, phrase) {
  const np = norm(phrase);
  if (!np) return null;
  // 1) full phrase as substring
  for (const c of cues) if (norm(c.text).includes(np)) return c.start;
  // 2) all significant keywords present, in order
  const kw = keywords(phrase);
  if (kw.length) {
    for (const c of cues) {
      const ct = norm(c.text);
      let idx = -1, ok = true;
      for (const w of kw) {
        const at = ct.indexOf(w, idx + 1);
        if (at < 0) { ok = false; break; }
        idx = at;
      }
      if (ok) return c.start;
    }
  }
  // 3) first 2 significant keywords anywhere
  if (kw.length >= 2) {
    for (const c of cues) {
      const ct = norm(c.text);
      if (kw.slice(0, 2).every((w) => ct.includes(w))) return c.start;
    }
  }
  return null;
}

const out = {};
for (const id of FLAG) {
  out[id] = { en: {}, pt: {} };
  for (const lang of ["en", "pt"]) {
    const e = data.entries.find((x) => x.id === id && x.lang === lang);
    if (!e) continue;
    const media = `/tmp/al-tax-${id}-${lang}.mp3`;
    const vtt = `/tmp/al-tax-${id}-${lang}.vtt`;
    const tmp = `/tmp/al-tax-${id}-${lang}.txt`;
    writeFileSync(tmp, e.text, "utf8");
    spawnSync(PYTHON, ["-m", "edge_tts", "-v", e.voice, "-f", tmp, "--write-media", media, "--write-subtitles", vtt]);
    if (!existsSync(vtt)) { console.log(`! no vtt for ${id}-${lang}`); continue; }
    const cues = parseVTT(vtt);
    const total = cues.length ? cues[cues.length - 1].end : 1;
    const beats = PHRASES[id] || {};
    for (const [beat, phr] of Object.entries(beats)) {
      const start = findStart(cues, phr[lang]);
      const frac = start != null ? start / total : null;
      out[id][lang][beat] = frac;
    }
    out[id][lang]._total = total;
  }
}

writeFileSync("dubbing/flow-beats-aligned.json", JSON.stringify(out, null, 2));
console.log("✓ wrote dubbing/flow-beats-aligned.json");
console.log(JSON.stringify(out, null, 2));
