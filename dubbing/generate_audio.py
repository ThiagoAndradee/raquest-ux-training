#!/usr/bin/env python3
"""
Generate per-chapter narration MP3s for the RAQUEST Erste Schritte course.

- Reads dubbing/narration.json
- For each chapter and each language (en, pt), synthesizes every line with the
  voice assigned to its speaker (NARRATOR / TRAINER / OPERATOR) via edge-tts,
  then concatenates the lines into one MP3 per chapter.
- Output: ../public/audio/ch{idx}-{lang}.mp3   (where the React app looks for them)

Different speakers = different natural voices → not robotic.

Requirements (run once on your Mac):
    pip3 install edge-tts
    brew install ffmpeg          # for concatenation

Run:
    cd raquest/aula-raquest-app/dubbing
    python3 generate_audio.py            # both languages
    python3 generate_audio.py --lang en  # just English
    python3 generate_audio.py --rate +8% # speak a bit faster
"""

import argparse
import asyncio
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
NARRATION = os.path.join(HERE, "narration.json")
OUT_DIR = os.path.abspath(os.path.join(HERE, "..", "public", "audio"))


def check_deps():
    try:
        import edge_tts  # noqa: F401
    except ImportError:
        sys.exit("Missing edge-tts. Install it:\n    pip3 install edge-tts")
    if subprocess.run(["which", "ffmpeg"], capture_output=True).returncode != 0:
        sys.exit("Missing ffmpeg. Install it:\n    brew install ffmpeg")


def clean_text(text):
    """edge-tts occasionally returns no audio when a line starts with a dash/
    punctuation, or has odd unicode dashes. Normalize to plain, speakable text."""
    t = text.replace("—", ", ").replace("–", ", ").replace("·", ", ")
    t = t.strip().lstrip(",.-— ").strip()
    # collapse doubled separators the replacements may have created
    while ", ," in t:
        t = t.replace(", ,", ",")
    return t or "."


async def _synth_once(text, voice, out_path, rate, timeout=20):
    import edge_tts
    from edge_tts.exceptions import NoAudioReceived
    clean = clean_text(text)
    kwargs = {"voice": voice}
    if rate:
        kwargs["rate"] = rate
    try:
        await asyncio.wait_for(
            edge_tts.Communicate(clean, **kwargs).save(out_path), timeout=timeout
        )
        if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
            return True
    except (NoAudioReceived, asyncio.TimeoutError):
        return False
    return False


async def synth_line(text, voice, out_path, rate, attempts=5):
    import edge_tts  # noqa: F401
    if await _synth_once(text, voice, out_path, rate):
        return True
    for n in range(1, attempts):
        await asyncio.sleep(0.8 + n * 0.6)
        if await _synth_once(text, voice, out_path, rate):
            return True
    # last resort: split the line into smaller chunks and synth each
    import re
    pieces = [p for p in re.split(r"(?<=[\.,;:])\s+", clean_text(text)) if p.strip()]
    if len(pieces) > 1:
        ok_parts = []
        with tempfile.TemporaryDirectory() as tmp:
            for i, piece in enumerate(pieces):
                part = os.path.join(tmp, f"{i:02d}.mp3")
                for _ in range(3):
                    if await _synth_once(piece, voice, part, rate, timeout=15):
                        ok_parts.append(part)
                        break
                    await asyncio.sleep(0.6)
            if ok_parts:
                concat(ok_parts, out_path)
                return True
    print(f"    ⚠️  skipped a line (no audio after {attempts} tries + split): {clean_text(text)[:50]}…")
    return False


def concat(parts, out_path):
    """Concatenate mp3 parts into one file using ffmpeg concat demuxer."""
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as lst:
        for p in parts:
            lst.write(f"file '{p}'\n")
        list_path = lst.name
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_path,
         "-c", "copy", out_path],
        check=True, capture_output=True,
    )
    os.unlink(list_path)


async def build(langs, rate):
    data = json.load(open(NARRATION, encoding="utf-8"))
    voices = data["voices"]
    os.makedirs(OUT_DIR, exist_ok=True)

    for lang in langs:
        vmap = voices[lang]
        for ch in data["chapters"]:
            idx = ch["id"]
            lines = ch[lang]
            with tempfile.TemporaryDirectory() as tmp:
                parts = []
                for i, line in enumerate(lines):
                    voice = vmap.get(line["s"], vmap["NARRATOR"])
                    part = os.path.join(tmp, f"{i:02d}.mp3")
                    ok = await synth_line(line["t"], voice, part, rate)
                    if ok:
                        parts.append(part)
                if not parts:
                    print(f"  ✗ ch{idx}-{lang}: no audio at all, skipping file")
                    continue
                out = os.path.join(OUT_DIR, f"ch{idx}-{lang}.mp3")
                concat(parts, out)
                print(f"  ✓ ch{idx}-{lang}.mp3  ({len(parts)} lines)")
        print(f"[{lang}] done → {OUT_DIR}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", choices=["en", "pt"], help="only this language")
    ap.add_argument("--rate", default="", help="edge-tts rate, e.g. +8%% or -5%%")
    args = ap.parse_args()

    check_deps()
    langs = [args.lang] if args.lang else ["en", "pt"]
    asyncio.run(build(langs, args.rate))
    print("\nAll done. The app will pick these up at public/audio/. "
          "Reload http://localhost:3000 and hit ▶ Narration in any chapter.")


if __name__ == "__main__":
    main()
