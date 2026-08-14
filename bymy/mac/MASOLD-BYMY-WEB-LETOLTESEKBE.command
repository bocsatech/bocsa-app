#!/bin/bash
# Dupla katt Macen: feltölti a ~/Downloads/bymy web (vagy Letöltések/bymy web) mappát GitHubról.
set -euo pipefail

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

echo "Letöltés GitHub main…"
curl -sfL "https://github.com/bocsatech/bocsa-app/archive/refs/heads/main.zip" -o "$TMP/repo.zip"
unzip -q "$TMP/repo.zip" -d "$TMP"
SRC="$TMP/bocsa-app-main/bymy"

# Runtime fájlok (web)
cp "$SRC/package.json" "$SRC/server.mjs" "$DEST/" 2>/dev/null || true
cp "$SRC/package-lock.json" "$SRC/vercel.json" "$DEST/" 2>/dev/null || true
rm -rf "$DEST/lib" "$DEST/public" "$DEST/scripts"
cp -R "$SRC/lib" "$DEST/lib"
cp -R "$SRC/public" "$DEST/public"
cp -R "$SRC/scripts" "$DEST/scripts" 2>/dev/null || true
[ -d "$SRC/data" ] && { rm -rf "$DEST/data"; cp -R "$SRC/data" "$DEST/data"; }

cat > "$DEST/README-HELYI.txt" <<'EOR'
Bymy weboldal — helyi másolat
==============================
Ez a mappa a weboldal gépen tartandó helye.
Ne a bocsa-app-ba mentsd a webes munkát.
Élő: https://bymy.vercel.app
EOR

echo ""
echo "Kész. Fájlok: $(find "$DEST" -type f | wc -l | tr -d ' ')"
open "$DEST" 2>/dev/null || true
read -r -p "ENTER…" _ || true
