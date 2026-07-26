#!/bin/bash
# Frissítés: helyi bocsa-app/autosweb → ~/Letöltések/autosweb
# Fontos: NEM kényszerít main ágat — a repo aktuális állapotát másolja.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE="$REPO/autosweb"
# shellcheck source=/dev/null
source "$(dirname "$0")/_target.sh"
TARGET="$(autosweb_target)"

echo "Autosweb frissítés (helyi repo → Letöltések)…"
echo "  Repo: $REPO"
echo "  Cél:  $TARGET"
echo ""

cd "$REPO"
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
echo "  Ág: $BRANCH"
git fetch origin 2>/dev/null || true
# Ne írjuk felül a feature ágat main-nel — a felhasználó pull-ozzon előtte.

if [ ! -f "$SOURCE/lib/jarmu-katalogus.mjs" ]; then
  echo "✗ Nincs járműkatalógus a forrásban."
  echo "  Futtasd: git pull origin cursor/mentesmarka-csv-katalogus-2aa0"
  exit 1
fi

if [ ! -d "$TARGET" ]; then
  echo "Nincs telepítve — létrehozom: $TARGET"
  mkdir -p "$TARGET"
fi

cp "$SOURCE/package.json" "$SOURCE/server.mjs" "$TARGET/"
cp -R "$SOURCE/scripts" "$TARGET/" 2>/dev/null || true
rsync -a --delete "$SOURCE/lib/" "$TARGET/lib/"
"$(dirname "$0")/rsync-public-preserve-images.sh" "$SOURCE" "$TARGET"

cd "$TARGET"
node scripts/embed-ad-form.mjs
npm install
npx playwright install chromium 2>/dev/null || true
npx playwright install chrome 2>/dev/null || true

VER=$(cat "$TARGET/public/version.txt" 2>/dev/null || echo "HIÁNYZIK")
echo ""
echo "✓ Frissítve: $TARGET"
echo "  Verzió: $VER"

if [ ! -f "$TARGET/lib/jarmu-katalogus.mjs" ]; then
  echo "  ✗ HIBA: jarmu-katalogus.mjs hiányzik"
  exit 1
fi
if ! grep -q '<select id="modell"' "$TARGET/public/hirdetesfeladas.html" 2>/dev/null; then
  echo "  ✗ HIBA: modell nem select"
  exit 1
fi
if ! grep -q 'jarmu-katalogus-ui' "$TARGET/public/js/form-core.js" 2>/dev/null; then
  echo "  ✗ HIBA: form-core nincs bekötve"
  exit 1
fi
echo "  ✓ Járműkatalógus OK"

if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti:3456 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "  ⚠ Port 3456 foglalt — leállítás…"
    kill -9 $PIDS 2>/dev/null || true
    sleep 1
  fi
fi

DESKTOP="$HOME/Desktop/Autosweb-indito.command"
cp "$SOURCE/mac/Autosweb-indito.command" "$DESKTOP"
chmod +x "$DESKTOP"
# Az indító mellé kell a _target.sh hivatkozás — másoljuk a mac mappát is a célba
mkdir -p "$TARGET/mac"
cp "$SOURCE/mac/_target.sh" "$SOURCE/mac/Autosweb-indito.command" "$TARGET/mac/" 2>/dev/null || true
echo "  ✓ Asztali indító frissítve"

echo ""
echo "  1) Indítsd: ~/Desktop/Autosweb-indito.command"
echo "  2) http://127.0.0.1:3456/hirdetesfeladas.html"
echo "  3) Cmd+Shift+R"
echo ""
echo "CSV: ~/Letöltések/mentesmarka/jarmu-katalogus.csv"
