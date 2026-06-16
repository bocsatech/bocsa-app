#!/usr/bin/env python3
"""Magyar szöveg → MP3 (gTTS, darabokban)."""
from pathlib import Path
import subprocess
import tempfile

from gtts import gTTS

ROOT = Path(__file__).resolve().parents[1]
TXT = ROOT / "documents/pdca/lean-management-magyar.txt"
OUT = ROOT / "documents/pdca/lean-management-magyar.mp3"
CHUNK = 4500


def chunks(text: str, size: int):
    parts = []
    buf = ""
    for para in text.split("\n\n"):
        block = para.strip()
        if not block:
            continue
        if len(buf) + len(block) + 2 <= size:
            buf = f"{buf}\n\n{block}".strip() if buf else block
        else:
            if buf:
                parts.append(buf)
            while len(block) > size:
                parts.append(block[:size])
                block = block[size:]
            buf = block
    if buf:
        parts.append(buf)
    return parts


def main():
    text = TXT.read_text(encoding="utf-8")
    pieces = chunks(text, CHUNK)
    mp3_parts = []

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        for i, piece in enumerate(pieces):
            part = tmp_path / f"part_{i:02d}.mp3"
            gTTS(text=piece, lang="hu", slow=False).save(str(part))
            mp3_parts.append(part)
            print(f"  rész {i + 1}/{len(pieces)}: {len(piece)} karakter")

        list_file = tmp_path / "list.txt"
        list_file.write_text(
            "\n".join(f"file '{p}'" for p in mp3_parts),
            encoding="utf-8",
        )
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(list_file),
                "-c",
                "copy",
                str(OUT),
            ],
            check=True,
            capture_output=True,
        )

    print(f"Kész: {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
