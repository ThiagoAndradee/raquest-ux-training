#!/usr/bin/env node
// Gera WebVTTs a partir das legendas em raquest/legendas/:
//   - PT e DE: conversão direta SRT -> VTT
//   - EN: mescla en_N.json (texto) com o timing do SRT (en key "0" = SRT cue 1)
// Saída: public/videos/subs/v{1,2}-{pt,de,en}.vtt
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const leg = path.resolve(root, "..", "legendas");
const out = path.join(root, "public", "videos", "subs");
fs.mkdirSync(out, { recursive: true });

const srtToVtt = (srtPath) => {
  const text = fs.readFileSync(srtPath, "utf8").replace(/\r/g, "");
  const cues = text
    .trim()
    .split(/\n\n+/)
    .map((block) => {
      const lines = block.split("\n");
      if (/^\d+$/.test(lines[0].trim())) lines.shift();
      const timeLine = lines.shift();
      const [start, end] = timeLine.split(" --> ");
      return `${start.replace(",", ".")} --> ${end.replace(",", ".")}\n${lines.join("\n")}`;
    });
  return "WEBVTT\n\n" + cues.join("\n\n") + "\n";
};

const pairs = [
  { srt: "legenda-pt-1.srt", out: "v1-pt.vtt" },
  { srt: "1. Erste Schritte RaQuest - Schulung-Besprechungsaufzeichnung.de.srt", out: "v1-de.vtt" },
  { srt: "legenda-pt-2.srt", out: "v2-pt.vtt" },
  { srt: "2. Erste Schritte RaQuest - Schulung-Besprechungsaufzeichnung.de.srt", out: "v2-de.vtt" },
];
for (const p of pairs) {
  fs.writeFileSync(path.join(out, p.out), srtToVtt(path.join(leg, p.srt)));
  console.log(`✓ ${p.out}`);
}

const buildEn = (srtName, enName, outName) => {
  const srt = fs.readFileSync(path.join(leg, srtName), "utf8").replace(/\r/g, "");
  const en = JSON.parse(fs.readFileSync(path.join(leg, enName), "utf8"));
  const blocks = srt.trim().split(/\n\n+/);
  const cues = [];
  blocks.forEach((block, i) => {
    const lines = block.split("\n");
    if (/^\d+$/.test(lines[0].trim())) lines.shift();
    const timeLine = lines.shift();
    const [start, end] = timeLine.split(" --> ");
    const t = en[String(i)];
    if (!t) return;
    cues.push(`${start.replace(",", ".")} --> ${end.replace(",", ".")}\n${t}`);
  });
  fs.writeFileSync(path.join(out, outName), "WEBVTT\n\n" + cues.join("\n\n") + "\n");
  console.log(`✓ ${outName} (${cues.length} cues)`);
};
buildEn("1. Erste Schritte RaQuest - Schulung-Besprechungsaufzeichnung.de.srt", "en_1.json", "v1-en.vtt");
buildEn("2. Erste Schritte RaQuest - Schulung-Besprechungsaufzeichnung.de.srt", "en_2.json", "v2-en.vtt");

console.log(`\nLegendas em: ${out}`);
