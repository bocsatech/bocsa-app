#!/bin/bash
# Frissítés: GitHub-ról CSAK autosweb → ~/Downloads/autosweb
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE="$REPO/autosweb"
TARGET="$HOME/Downloads/autosweb"

echo "Autosweb frissítés (GitHub main → Letöltések)…"
echo "  Repo: $REPO"
echo ""

cd "$REPO"
git fetch origin main
git pull origin main -- autosweb/ 2>/dev/null || git checkout origin/main -- autosweb/

if [ ! -d "$TARGET" ]; then
  echo "Nincs telepítve. Futtasd: ./telepites.command"
  exit 1
fi

cp "$SOURCE/package.json" "$SOURCE/server.mjs" "$TARGET/"
rsync -a --delete "$SOURCE/lib/" "$TARGET/lib/"
rsync -a --delete "$SOURCE/public/" "$TARGET/public/"

cd "$TARGET"
npm install
npx playwright install chromium 2>/dev/null || true

VER=$(cat "$TARGET/public/version.txt" 2>/dev/null || echo "HIÁNYZIK")
echo ""
echo "✓ Frissítve: $TARGET"
echo "  Verzió: $VER"

if [ ! -f "$TARGET/public/css/automax.css" ]; then
  echo "  ✗ HIBA: automax.css hiányzik — git pull sikertelen?"
  exit 1
fi
if grep -q 'theme-automax' "$TARGET/public/hirdetesfeladas.html"; then
  echo "  ✓ AUTOMAX téma OK"
else
  echo "  ✗ HIBA: régi HTML!"
  exit 1
fi

echo ""
echo "  1) Állítsd le a futó Autosweb-et (Ctrl+C a terminálban)"
echo "  2) Indítsd újra: ~/Desktop/Autosweb-indito.command"
echo "  3) Böngésző: Cmd+Shift+R (kemény frissítés)"
echo ""
echo "Jó verzió = fekete háttér, narancs gombok. Világos szürke = még régi."
