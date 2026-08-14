#!/bin/bash
# Dupla katt / Terminál: feltölti a ~/Downloads/bymy web (vagy Letöltések/bymy web) mappát.
# Csak a bymy/ fa — NEM a teljes monorepo (elkerüli az ékezetes .app unzip hibákat).
set -euo pipefail

export LANG="${LANG:-en_US.UTF-8}"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"

if [ -d "${HOME}/Letöltések" ]; then
  ROOT="${HOME}/Letöltések"
else
  ROOT="${HOME}/Downloads"
fi
DEST="${ROOT}/bymy web"
mkdir -p "$DEST"

echo "Bymy web → $DEST"
TMP=$(mktemp -d)
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

echo "Letöltés GitHub main (csak bymy/)…"

# Sparse clone — nincs teljes zip, nincs ékezetes launcher unzip
if command -v git >/dev/null 2>&1; then
  git clone --depth 1 --filter=blob:none --sparse \
    https://github.com/bocsatech/bocsa-app.git "$TMP/repo"
  (
    cd "$TMP/repo"
    git sparse-checkout set bymy
  )
  SRC="$TMP/repo/bymy"
else
  # Fallback: zip, de CSAK bymy/ kicsomagolása, overwrite, UTF-8
  curl -sfL "https://github.com/bocsatech/bocsa-app/archive/refs/heads/main.zip" -o "$TMP/repo.zip"
  mkdir -p "$TMP/extract"
  if unzip -O UTF-8 -o -q "$TMP/repo.zip" "bocsa-app-main/bymy/*" -d "$TMP/extract" 2>/dev/null; then
    :
  elif ditto -x -k "$TMP/repo.zip" "$TMP/extract" 2>/dev/null; then
    :
  else
    unzip -o -q "$TMP/repo.zip" "bocsa-app-main/bymy/*" -d "$TMP/extract" || true
  fi
  SRC="$TMP/extract/bocsa-app-main/bymy"
fi

if [ ! -d "$SRC/public" ]; then
  echo "✗ HIBA: nincs bymy/public a letöltésben"
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
Bymy weboldal — helyi másolat
==============================
Ez a mappa a weboldal gépen tartandó helye.
Ne a bocsa-app-ba mentsd a webes munkát.
Élő: https://bymy.vercel.app
EOR

COUNT=$(find "$DEST" -type f | wc -l | tr -d ' ')
echo ""
echo "Kész: $DEST"
echo "Fájlok: $COUNT"
if [ ! -f "$DEST/public/index.html" ]; then
  echo "✗ HIBA: index.html hiányzik"
  exit 1
fi
open "$DEST" 2>/dev/null || true
echo ""
echo "Ha Terminálból futtattad: ablak bezárható."
