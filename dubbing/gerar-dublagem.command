#!/bin/bash
# Double-click this to generate the RAQUEST course narration (EN + PT).
# It installs edge-tts if needed, then builds the per-chapter MP3s.
cd "$(dirname "$0")" || exit 1

# The Homebrew python (3.12/3.14) on this Mac has a broken libexpat.
# Apple's system python works — find a python whose pyexpat actually loads.
PY=""
for c in /usr/bin/python3 python3.13 python3.11 python3; do
  if "$c" -c "import pyexpat" 2>/dev/null; then PY="$c"; break; fi
done
if [ -z "$PY" ]; then
  echo "❌ nenhum python funcional encontrado (pyexpat quebrado em todos)."
  read -r; exit 1
fi
echo "🎙️  RAQUEST — gerando dublagem (EN + PT) com $PY…"
echo

# ensure edge-tts for that python
if ! "$PY" -c "import edge_tts" 2>/dev/null; then
  echo "→ instalando edge-tts…"
  "$PY" -m pip install --user edge-tts || { echo "❌ falha ao instalar edge-tts"; read -r; exit 1; }
fi

# ensure ffmpeg
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "❌ ffmpeg não encontrado. Instale com:  brew install ffmpeg"
  read -r
  exit 1
fi

python3 generate_audio.py "$@"

echo
echo "✅ Pronto. Os MP3s estão em ../public/audio/"
echo "   Abra http://localhost:3000 e clique em ▶ Narração num capítulo."
read -r -p "Enter para fechar…"
