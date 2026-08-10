#!/bin/bash
# Duplo-clique: gera a narração do explainer "Tax Withholding 101" (EN + PT) via edge-tts.
# Saída: ../public/audio/tax-<id>-<lang>.mp3  (onde o componente Tax101 procura).
# Usa o python que funciona (evita o Homebrew com libexpat quebrado) e chama a API, não a CLI.
cd "$(dirname "$0")" || exit 1

PY=""
for c in /usr/bin/python3 python3.13 python3.11 python3.12 python3; do
  if command -v "$c" >/dev/null 2>&1 && "$c" -c "import pyexpat" 2>/dev/null; then PY="$c"; break; fi
done
[ -z "$PY" ] && { echo "❌ nenhum python funcional (pyexpat)"; read -r; exit 1; }
echo ">> usando $PY"
"$PY" -c "import edge_tts" 2>/dev/null || "$PY" -m pip install --user -U edge-tts

OUT="$(cd .. && pwd)/public/audio"; mkdir -p "$OUT"
OUT="$OUT" "$PY" - <<'PY'
import os, json, asyncio, edge_tts
from edge_tts.exceptions import NoAudioReceived
HERE=os.path.dirname(os.path.abspath("tax-narration.json"))
data=json.load(open("tax-narration.json", encoding="utf-8"))
voices=data["voices"]; OUT=os.environ["OUT"]

def clean(t):
    t=t.replace("—",", ").replace("–",", ").strip().lstrip(",.-— ").strip()
    while ", ," in t: t=t.replace(", ,", ",")
    return t or "."

async def synth(text, voice, path, tries=3):
    for _ in range(tries):
        try:
            await edge_tts.Communicate(clean(text), voice=voice).save(path)
            if os.path.exists(path) and os.path.getsize(path)>0: return True
        except NoAudioReceived:
            await asyncio.sleep(1.0)
    print("  ⚠️  falhou:", path); return False

async def main():
    for lang, voice in voices.items():
        for sc in data["scenes"]:
            p=os.path.join(OUT, f"tax-{sc['id']}-{lang}.mp3")
            await synth(sc[lang], voice, p)
            print("  ✓", os.path.basename(p))
        print(f"[{lang}] pronto → {OUT}")

asyncio.run(main())
PY
echo ""; echo "✅ Narração do Tax 101 gerada em ../public/audio/"
read -p "Enter pra fechar."
