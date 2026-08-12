#!/bin/bash
# Csak a futtatáshoz kellő fájlok → ~/Downloads/autosweb (sem mac/, sem README)
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE="$REPO/autosweb"
TARGET="$HOME/Downloads/autosweb"
DESKTOP="$HOME/Desktop/Autosweb-indito.command"

echo "Autosweb telepítés"
echo "  Forrás: $SOURCE"
echo "  Cél:    $TARGET"
echo ""

# Mobil feature ág (fotók + Hirdetéseim). Main: AUTOSWEB_BRANCH=main
AUTOSWEB_BRANCH="${AUTOSWEB_BRANCH:-cursor/bymy-brand-de62}"

cd "$REPO"
git fetch origin "$AUTOSWEB_BRANCH" 2>/dev/null || true
git checkout "origin/${AUTOSWEB_BRANCH}" -- autosweb/ 2>/dev/null || true

mkdir -p "$TARGET/public" "$HOME/Desktop"

cp "$SOURCE/package.json" "$SOURCE/server.mjs" "$TARGET/"

if [ -d "$SOURCE/lib" ]; then
  rsync -a --delete "$SOURCE/lib/" "$TARGET/lib/"
fi

if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "$SOURCE/public/" "$TARGET/public/"
else
  rm -rf "$TARGET/public"
  cp -R "$SOURCE/public" "$TARGET/public"
fi
cp -R "$SOURCE/scripts" "$TARGET/" 2>/dev/null || true

cd "$TARGET"
node scripts/embed-ad-form.mjs 2>/dev/null || true
npm install
npx playwright install chromium 2>/dev/null || true
npx playwright install chrome 2>/dev/null || true

cp "$SOURCE/mac/Autosweb-indito.command" "$DESKTOP"
chmod +x "$DESKTOP"

echo ""
echo "Kész."
echo "  Weboldal: $TARGET"
echo "  Indító:   $DESKTOP"
echo ""
echo "A Letöltések mappában: package.json, server.mjs, lib/, public/, node_modules/"
read -r -p "ENTER…" _ >/dev/null || true
