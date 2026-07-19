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

cd "$REPO"
git fetch origin main 2>/dev/null || true
git checkout origin/main -- autosweb/ 2>/dev/null || true

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

cat > "$DESKTOP" << 'LAUNCHER'
#!/bin/bash
set -euo pipefail
TARGET="$HOME/Downloads/autosweb"
cd "$TARGET" || {
  osascript -e 'display alert "Autosweb" message "Hiányzik: ~/Downloads/autosweb — telepítsd újra."'
  exit 1
}
if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti:3456 2>/dev/null || true)
  [ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null || true
fi
if [ ! -f public/css/site-app.css ] || ! grep -q site-app public/hirdetesfeladas.html; then
  osascript -e 'display alert "Régi verzió" message "Futtasd: bocsa-app/autosweb/mac/frissites.command"'
  exit 1
fi
[ ! -d node_modules ] && npm install
open "http://127.0.0.1:3456"
echo "Autosweb $(cat public/version.txt 2>/dev/null) — http://127.0.0.1:3456"
npm start
LAUNCHER

chmod +x "$DESKTOP"

echo ""
echo "Kész."
echo "  Weboldal: $TARGET"
echo "  Indító:   $DESKTOP"
echo ""
echo "A Letöltések mappában: package.json, server.mjs, lib/, public/, node_modules/"
read -r -p "ENTER…" _ >/dev/null || true
