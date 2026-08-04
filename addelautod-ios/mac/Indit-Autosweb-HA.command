#!/bin/bash
# Élő használtautó.hu keresés az iOS Simulatorhoz — Autosweb 3456-on
set -euo pipefail

BRANCH="cursor/addelautod-mobile-de62"
REPO="https://github.com/bocsatech/bocsa-app.git"
TMP="$HOME/Downloads/bocsa-ha-tmp"
PORT=3456

echo "=== Autosweb indítás (HA keresés) ==="
echo "Ág: $BRANCH → http://127.0.0.1:$PORT"
echo ""

mkdir -p "$HOME/Downloads"

# Régi szerver leállítása
if lsof -ti tcp:"$PORT" >/dev/null 2>&1; then
  echo "Port $PORT foglalt — leállítás…"
  lsof -ti tcp:"$PORT" | xargs kill -9 2>/dev/null || true
  sleep 1
fi

rm -rf "$TMP"
echo "GitHub klón…"
git clone --depth 1 --branch "$BRANCH" "$REPO" "$TMP"

cd "$TMP/autosweb"
echo "npm install…"
npm install
echo "Playwright Chromium…"
npx playwright install chromium 2>/dev/null || true

echo ""
echo "Szerver indul. Hagyd futni ezt az ablakot."
echo "Chrome megnyílhat Cloudflare-hez — jelöld be a pipát."
echo "Utána az iOS appban: Újrapróbálás / új keresés."
echo ""

npm start
