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

if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "$SOURCE/public/" "$TARGET/public/"
else
  rm -rf "$TARGET/public"
  cp -R "$SOURCE/public" "$TARGET/public"
fi

cd "$TARGET"
npm install

cat > "$DESKTOP" << 'LAUNCHER'
#!/bin/bash
cd "$HOME/Downloads/autosweb" || {
  osascript -e 'display alert "Autosweb" message "Hiányzik: ~/Downloads/autosweb — telepítsd újra."'
  exit 1
}
open "http://127.0.0.1:3456"
echo "Autosweb: http://127.0.0.1:3456  (Ctrl+C = leállítás)"
npm start
LAUNCHER

chmod +x "$DESKTOP"

echo ""
echo "Kész."
echo "  Weboldal: $TARGET"
echo "  Indító:   $DESKTOP"
echo ""
echo "A Letöltések mappában csak: package.json, server.mjs, public/, node_modules/"
read -r -p "ENTER…" _ >/dev/null || true
