#!/usr/bin/env node
// Puxa todos os vídeos da library do Bunny Stream via API, casa pelo título (nome do arquivo)
// com o padrão ch{ci}-{seg}-v{v}-... e (re)escreve src/bunny.js com o mapa completo.
// Lê BUNNY_STREAM_KEY de .env.local. Library fixa = 715897 (BUNNY_LIB).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const envPath = path.join(root, ".env.local");

function readEnv(p) {
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = readEnv(envPath);
const KEY = env.BUNNY_STREAM_KEY;
const LIB = "715897";
if (!KEY) {
  console.error("BUNNY_STREAM_KEY não achado em .env.local");
  process.exit(1);
}

async function listVideos() {
  const all = [];
  let page = 1;
  while (true) {
    const url = `https://video.bunnycdn.com/library/${LIB}/videos?page=${page}&itemsPerPage=100`;
    const res = await fetch(url, { headers: { AccessKey: KEY, Accept: "application/json" } });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`API erro ${res.status}: ${txt.slice(0, 200)}`);
      if (res.status === 401) console.error("→ chave inválida/malformada. Re-copia do painel Bunny.");
      process.exit(1);
    }
    const data = await res.json();
    all.push(...(data.items || []));
    if (all.length >= (data.totalItems || 0) || (data.items || []).length === 0) break;
    page++;
    if (page > 50) break;
  }
  return all;
}

const keyFromTitle = (title) => {
  // "ch8-1-v1-24m46-26m15.mp4" -> "8-1"
  const m = String(title).match(/^ch(\d+)-(\d+)-v\d+-/i);
  return m ? `${m[1]}-${m[2]}` : null;
};

const out = await listVideos();
console.log(`Bunny retornou ${out.length} vídeos da library ${LIB}.`);

const map = {};
const unmatched = [];
for (const v of out) {
  const k = keyFromTitle(v.title);
  if (k) map[k] = v.guid;
  else unmatched.push(v.title);
}

const keys = Object.keys(map).sort((a, b) => {
  const [ca, sa] = a.split("-").map(Number);
  const [cb, sb] = b.split("-").map(Number);
  return ca - cb || sa - sb;
});
console.log(`Casados ${keys.length} segmentos:`);
for (const k of keys) console.log(`  ${k} -> ${map[k]}  (${out.find(v => keyFromTitle(v.title) === k)?.title})`);
if (unmatched.length) {
  console.log(`\nNão casaram (${unmatched.length}):`);
  for (const t of unmatched) console.log(`  - ${t}`);
}

// monta src/bunny.js
const entries = keys.map((k) => `  "${k}": "${map[k]}",`).join("\n");
const file = `// Mapa dos segmentos subidos no Bunny Stream — gerado por scripts/fetch-bunny.mjs.
// Chave = "{chapterIdx}-{segIdxOneBased}" (mesmo padrão dos nomes de arquivo em public/videos/segments).
// URL do player: https://player.mediadelivery.net/play/<LIB>/<videoId>
export const BUNNY_LIB = "${LIB}";

export const BUNNY_SEGMENTS = {
${entries}
};

export const bunnyIdFor = (chapterIdx, segIdxOneBased) =>
  BUNNY_SEGMENTS[\`\${chapterIdx}-\${segIdxOneBased}\`] || null;

export const bunnyUrl = (videoId) =>
  \`https://player.mediadelivery.net/play/\${BUNNY_LIB}/\${videoId}\`;
`;

fs.writeFileSync(path.join(root, "src", "bunny.js"), file);
console.log(`\nsrc/bunny.js escrito com ${keys.length} segmentos.`);
