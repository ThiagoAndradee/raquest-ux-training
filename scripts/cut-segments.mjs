#!/usr/bin/env node
// Corta os 2 vídeos de treino em segmentos menores (1 arquivo por segmento de capítulo),
// lendo os timestamps direto de src/content.js — sem duplicar dados à mão.
// Saída: public/videos/segments/ch{cap}-{n}-v{video}-{ss}-{ee}.mp4
// Requer: ffmpeg (brew install ffmpeg).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, ".."); // aula-raquest-app

const src = fs.readFileSync(path.join(root, "src", "content.js"), "utf8");
const plain = src.replace(/\bexport\s+/g, "");
const factory = new Function(plain + "\nreturn { chapters };");
const { chapters } = factory();

// Vídeos-fonte (dublados em PT). Pra usar os legendados, troque pra legendas/*.mp4.
const SRC = {
  1: path.resolve(root, "..", "1. Erste Schritte RaQuest - Schulung-Besprechungsaufzeichnung_dublado.mp4"),
  2: path.resolve(root, "..", "2. Erste Schritte RaQuest - Schulung-Besprechungsaufzeichnung_dublado.mp4"),
};

const OUT = path.join(root, "public", "videos", "segments");
fs.mkdirSync(OUT, { recursive: true });

const toSec = (ts) => {
  const p = ts.split(":").map(Number);
  if (p.length === 2) return p[0] * 60 + p[1];
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  return 0;
};
const slug = (s) =>
  s.toLowerCase()
    .replace(/[⭐]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const haveFfmpeg = () => {
  try { execSync("ffmpeg -version", { stdio: "ignore" }); return true; } catch { return false; }
};
if (!haveFfmpeg()) {
  console.error("ffmpeg não achado. Instale: brew install ffmpeg");
  process.exit(1);
}

for (const v of [1, 2]) {
  if (!fs.existsSync(SRC[v])) {
    console.error(`Vídeo-fonte não achado: ${SRC[v]}`);
    console.error("Ajuste SRC no topo do script se precisar.");
    process.exit(1);
  }
}

let count = 0;
const manifest = [];
for (let ci = 0; ci < chapters.length; ci++) {
  const ch = chapters[ci];
  if (!ch.video || ch.video.length === 0) continue;
  ch.video.forEach((s, i) => {
    const start = toSec(s.ss);
    const end = toSec(s.ee);
    const dur = end - start;
    const file = `ch${ci}-${i + 1}-v${s.v}-${s.ss.replace(":", "m")}-${s.ee.replace(":", "m")}.mp4`;
    const outPath = path.join(OUT, file);
    // stream copy = rápido e sem perda; -avoid_negative_ts corrige timestamps de corte.
    const cmd = `ffmpeg -y -hide_banner -loglevel error -ss ${start} -to ${end} -i "${SRC[s.v]}" -c copy -avoid_negative_ts make_zero "${outPath}"`;
    try {
      execSync(cmd, { stdio: "inherit" });
      const kb = Math.round(fs.statSync(outPath).size / 1024);
      console.log(`  ✓ ${file}  (${dur}s, ${kb} KB)`);
      manifest.push({ chapter: ci, seg: i, v: s.v, ss: s.ss, ee: s.ee, label: s.label, file });
      count++;
    } catch (e) {
      console.error(`  ✗ falhou: ${file} — tentando re-encode...`);
      try {
        execSync(cmd.replace("-c copy", "-c:v libx264 -preset veryfast -crf 23 -c:a aac"), { stdio: "inherit" });
        manifest.push({ chapter: ci, seg: i, v: s.v, ss: s.ss, ee: s.ee, label: s.label, file });
        count++;
      } catch (e2) {
        console.error(`  ✗✗ re-encode também falhou: ${file}`);
      }
    }
  });
}

fs.writeFileSync(path.join(OUT, "segments.json"), JSON.stringify(manifest, null, 2));
console.log(`\n${count} segmentos gerados em:\n  ${OUT}`);
console.log("segments.json salvo junto (mapeia capítulo → arquivo).");
