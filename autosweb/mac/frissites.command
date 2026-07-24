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
cp -R "$SOURCE/scripts" "$TARGET/" 2>/dev/null || true
rsync -a --delete "$SOURCE/lib/" "$TARGET/lib/"
rsync -a --delete "$SOURCE/public/" "$TARGET/public/"

cd "$TARGET"
node scripts/embed-ad-form.mjs
npm install
npx playwright install chromium 2>/dev/null || true
npx playwright install chrome 2>/dev/null || true

VER=$(cat "$TARGET/public/version.txt" 2>/dev/null || echo "HIÁNYZIK")
echo ""
echo "✓ Frissítve: $TARGET"
echo "  Verzió: $VER"

if [ ! -f "$TARGET/public/css/automax.css" ]; then
  echo "  ✗ HIBA: automax.css hiányzik — git pull sikertelen?"
  exit 1
fi
if grep -q 'site-app' "$TARGET/public/hirdetesfeladas.html"; then
  echo "  ✓ site-app téma OK"
else
  echo "  ✗ HIBA: régi HTML — nincs site-app!"
  exit 1
fi

if [ ! -f "$TARGET/public/css/site-app.css" ]; then
  echo "  ✗ HIBA: site-app.css hiányzik — git pull sikertelen?"
  exit 1
fi

if [ ! -f "$TARGET/public/fugveny.html" ]; then
  echo "  ✗ HIBA: fugveny.html hiányzik — git pull / frissítés sikertelen?"
  exit 1
fi
if [ ! -f "$TARGET/lib/fugveny-api.mjs" ]; then
  echo "  ✗ HIBA: fugveny-api.mjs hiányzik"
  exit 1
fi
echo "  ✓ Függvény oldal OK (/fugveny.html)"

if grep -q 'id="gyartasi_ev"' "$TARGET/public/import.html" 2>/dev/null; then
  echo "  ✓ Import űrlap OK"
else
  echo "  ✗ HIBA: import.html űrlap hiányzik!"
  exit 1
fi

if grep -q 'home-nearby' "$TARGET/public/index.html" 2>/dev/null; then
  echo "  ✓ Főoldal: közelben widget OK"
else
  echo "  ✗ HIBA: index.html régi — nincs home-nearby (git pull + frissites újra)"
  exit 1
fi

if ! grep -q 'home-search-form' "$TARGET/public/index.html" 2>/dev/null; then
  echo "  ✓ Főoldal: fejléc keresősáv törölve"
else
  echo "  ✗ HIBA: index.html még tartalmazza a fejléc keresőt"
  exit 1
fi

if [ -f "$TARGET/public/js/home-nearby.js" ] && [ -f "$TARGET/public/images/home-nearby-map.svg" ]; then
  echo "  ✓ home-nearby.js + térkép OK"
else
  echo "  ✗ HIBA: hiányzik home-nearby.js vagy a térkép"
  exit 1
fi

INDEX_VER=$(grep -o 'autosweb-version" content="[^"]*' "$TARGET/public/index.html" | head -1 | sed 's/.*"//')
echo "  Főoldal verzió: ${INDEX_VER:-?}"

echo ""
echo "  1) Állítsd le a futó Autosweb-et (Ctrl+C a terminálban)"
if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti:3456 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "  ⚠ Port 3456 foglalt — régi szerver fut. Leállítás…"
    kill -9 $PIDS 2>/dev/null || true
    sleep 1
    echo "  ✓ Régi szerver leállítva"
  fi
fi
echo "  2) Indítsd újra: ~/Desktop/Autosweb-indito.command"
echo "  3) Böngésző: http://127.0.0.1:3456/  (NEM a Vercel weboldal!)"
echo "  4) Cmd+Shift+R (kemény frissítés)"
echo ""
echo "Jó verzió = világos háttér, nincs fejléc keresősáv, bal oldalon „Új hirdetések a közeledben”."

DESKTOP="$HOME/Desktop/Autosweb-indito.command"
if [ -f "$SOURCE/mac/Autosweb-indito.command" ]; then
  cp "$SOURCE/mac/Autosweb-indito.command" "$DESKTOP"
  chmod +x "$DESKTOP"
  echo "  ✓ Asztali indító frissítve: $DESKTOP"
fi
