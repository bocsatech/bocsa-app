#!/bin/bash
# Másolja a weboldalt → ~/Downloads/bymy web (vagy Letöltések/bymy web)
# tar.gz + CSAK bymy/ — nincs unzip, nincs ékezetes .app hiba, nincs replace prompt
set -euo pipefail
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8

if [ -d "${HOME}/Letöltések" ]; then
  ROOT="${HOME}/Letöltések"
else
  ROOT="${HOME}/Downloads"
fi
DEST="${ROOT}/bymy web"
mkdir -p "$DEST"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "Bymy web → $DEST"
echo "Letöltés (tar.gz, csak bymy/)…"
curl -sfL "https://codeload.github.com/bocsatech/bocsa-app/tar.gz/refs/heads/main" -o "$TMP/repo.tgz"

TOP=$(tar -tzf "$TMP/repo.tgz" | head -1 | cut -d/ -f1)
mkdir -p "$TMP/e"
tar -xzf "$TMP/repo.tgz" -C "$TMP/e" "${TOP}/bymy"
SRC="$TMP/e/${TOP}/bymy"

if [ ! -d "$SRC/public" ]; then
  echo "✗ HIBA: nincs bymy/public"
  exit 1
fi

echo "Másolás…"
cp "$SRC/package.json" "$SRC/server.mjs" "$DEST/" 2>/dev/null || true
cp "$SRC/package-lock.json" "$SRC/vercel.json" "$DEST/" 2>/dev/null || true
rm -rf "$DEST/lib" "$DEST/public" "$DEST/scripts" "$DEST/data"
cp -R "$SRC/lib" "$DEST/lib"
cp -R "$SRC/public" "$DEST/public"
[ -d "$SRC/scripts" ] && cp -R "$SRC/scripts" "$DEST/scripts"
[ -d "$SRC/data" ] && cp -R "$SRC/data" "$DEST/data"

cat > "$DEST/README-HELYI.txt" <<'EOR'
Bymy web — helyi másolat (Letöltések/bymy web)
Élő: https://bymy.vercel.app
EOR

echo ""
echo "Kész: $DEST"
echo "Fájlok: $(find "$DEST" -type f | wc -l | tr -d ' ')"
test -f "$DEST/public/index.html"
open "$DEST" 2>/dev/null || true
