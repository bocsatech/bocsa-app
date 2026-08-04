#!/bin/bash
# Használtautó mobil keresés — Autosweb a feature ágról (NEM a main / Asztali indító!)
# A main ágon NINCS /api/ha-search — ezért az Asztali Autosweb-indito.command nem elég.
set -euo pipefail

BRANCH="cursor/addelautod-mobile-de62"
REPO="https://github.com/bocsatech/bocsa-app.git"
TARGET="$HOME/Downloads/autosweb-ha"
PORT=3456

echo "══════════════════════════════════════"
echo " Autosweb — HA mobil keresés"
echo " Ág: $BRANCH"
echo " Cél: $TARGET"
echo "══════════════════════════════════════"
echo ""
echo "FIGYELEM: Az Asztali Autosweb-indito a MAIN ágat tölti —"
echo "abban NINCS használtautó mobil keresés API."
echo "Ezt az indítót használd az iOS Simulatorhoz."
echo ""

mkdir -p "$HOME/Downloads"

if lsof -ti tcp:"$PORT" >/dev/null 2>&1; then
  echo "Port $PORT leállítás (régi Autosweb)…"
  lsof -ti tcp:"$PORT" | xargs kill -9 2>/dev/null || true
  sleep 1
fi

rm -rf "$TARGET-tmp"
git clone --depth 1 --branch "$BRANCH" "$REPO" "$TARGET-tmp"
rm -rf "$TARGET"
mkdir -p "$TARGET"
# Csak az autosweb kell
if command -v ditto >/dev/null 2>&1; then
  ditto "$TARGET-tmp/autosweb" "$TARGET"
else
  cp -R "$TARGET-tmp/autosweb/." "$TARGET/"
fi
rm -rf "$TARGET-tmp"

cd "$TARGET"
echo "npm install…"
npm install
npx playwright install chromium 2>/dev/null || true

# Ellenőrzés: van-e ha-search
if ! grep -q "ha-search" "$TARGET/server.mjs" 2>/dev/null; then
  echo "HIBA: ebben a másolatban nincs /api/ha-search"
  exit 1
fi

echo ""
echo "Szerver indul → http://127.0.0.1:$PORT"
echo "Hagyd futni. Simulatorban: Újrapróbálás"
echo "Terminálban kereséskor: [ha-search] sorok"
echo ""

npm start
