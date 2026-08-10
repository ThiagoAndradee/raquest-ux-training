// Extracts the `narration` text from every Tax101 scene (the karaoke source of truth)
// and writes dubbing/tax-narration.json so the TTS script can regenerate the audio
// to match the on-screen karaoke exactly.
//
// Run: node dubbing/gen-tax-narration.mjs
import { scenes } from "../src/tax101/tax-content.js";
import { writeFileSync } from "fs";

const VOICES = {
  en: "en-US-GuyNeural",
  pt: "pt-BR-AntonioNeural",
};

const entries = [];
for (const s of scenes) {
  for (const lang of ["en", "pt"]) {
    const text = s[lang] && s[lang].narration;
    if (!text) continue;
    entries.push({
      id: s.id,
      lang,
      voice: VOICES[lang],
      text,
      out: `public/audio/tax-${s.id}-${lang}.mp3`,
    });
  }
}

const out = {
  _about: "Karaoke narration for the Tax Withholding 101 explainer. This text is the source of truth — the audio is regenerated from it so the on-screen lyrics always match the spoken narration.",
  voices: VOICES,
  entries,
};

writeFileSync("dubbing/tax-narration.json", JSON.stringify(out, null, 2));
console.log(`✓ wrote dubbing/tax-narration.json — ${entries.length} entries (${entries.length / 2} scenes × 2 langs)`);
