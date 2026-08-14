#!/bin/bash
# Megbízható másoló: tar.gz + csak bymy/ (nincs unzip, nincs ékezetes .app)
set -euo pipefail
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8

if [ -d "${HOME}/Letöltések" ]; then ROOT="${HOME}/Letöltések"; else ROOT="${HOME}/Downloads"; fi
DEST="${ROOT}/bymy web"
mkdir -p "$DEST"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "Bymy web → $DEST"
echo "Letöltés (tar.gz, csak bymy/)…"
curl -sfL "https://codeload.github.com/bocsatech/bocsa-app/tar.gz/refs/heads/main" -o "$TMP/repo.tgz"

# Csak a bymy mappa a tarballból
mkdir -p "$TMP/extract"
tar -xzf "$TMP/repo.tgz" -C "$TMP/extract" --strip-components=2 \
  "$(tar -tzf "$TMP/repo.tgz" | head -1 | cut -d/ -f1)/bymy"

# strip-components néha máshogy nestel — keressük a public-ot
SRC=""
if [ -d "$TMP/extract/public" ]; then
  SRC="$TMP/extract"
elif [ -d "$TMP/extract/bymy/public" ]; then
  SRC="$TMP/extract/bymy"
else
  SRC=$(find "$TMP/extract" -type d -name public -path '*/bymy/public' 2>/dev/null | head -1 | sed 's|/public$||')
fi

if [ -z "${SRC}" ] || [ ! -d "${SRC}/public" ]; then
  # Fallback: teljes bymy fa kinyerése név szerint
  tar -xzf "$TMP/repo.tgz" -C "$TMP/extract" --wildcards '*/bymy/*' 2>/dev/null || \
  tar -xzf "$TMP/repo.tgz" -C "$TMP/extract"
  SRC=$(find "$TMP/extract" -type d -name bymy | head -1)
fi

if [ ! -d "${SRC}/public" ]; then
  echo "✗ HIBA: nem találom a bymy/public mappát"
  find "$TMP/extract" -maxdepth 3 -type d | head -40
  exit 1
fi

echo "Másolás innen: $SRC"
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

echo "Kész. Fájlok: $(find "$DEST" -type f | wc -l | tr -d ' ')"
test -f "$DEST/public/index.html"
open "$DEST" 2>/dev/null || true
