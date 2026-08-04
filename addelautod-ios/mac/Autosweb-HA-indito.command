#!/bin/bash
# Használtautó mobil keresés — külön port, hogy NE ütközzön az Asztali Autoswebbel.
# Asztali Autosweb = main = 3456 (Bocsa)
# Ez         = feature ág = 3457 (iOS HA keresés)
set -euo pipefail

BRANCH="cursor/addelautod-mobile-de62"
REPO="https://github.com/bocsatech/bocsa-app.git"
TARGET="$HOME/Downloads/autosweb-ha"
PORT=3457

echo "══════════════════════════════════════"
echo " Autosweb — HA mobil keresés"
echo " Ág:   $BRANCH"
echo " Port: $PORT  (Asztali Autosweb maradhat 3456-on)"
echo " Cél:  $TARGET"
echo "══════════════════════════════════════"
echo ""
echo "NE zárd be ezt az ablakot. Az Asztali Autosweb-indito"
echo "a 3456-ot használja — ez a 3457-et, nem ölik egymást."
echo ""

mkdir -p "$HOME/Downloads"

if lsof -ti tcp:"$PORT" >/dev/null 2>&1; then
  echo "Port $PORT leállítás…"
  lsof -ti tcp:"$PORT" | xargs kill -9 2>/dev/null || true
  sleep 1
fi

rm -rf "$TARGET-tmp"
git clone --depth 1 --branch "$BRANCH" "$REPO" "$TARGET-tmp"
rm -rf "$TARGET"
mkdir -p "$TARGET"
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

if ! grep -q "ha-search" "$TARGET/server.mjs" 2>/dev/null; then
  echo "HIBA: ebben a másolatban nincs /api/ha-search"
  exit 1
fi

echo ""
echo "Szerver indul → http://127.0.0.1:$PORT"
echo "Simulator: Újrapróbálás (az app a 3457-et hívja)"
echo "Kereséskor: [ha-search] sorok ebben a Terminálban"
echo ""

export PORT
npm start
