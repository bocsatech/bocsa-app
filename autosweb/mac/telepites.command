#!/bin/bash
# Egyszeri telepítés: repo → ~/Downloads/autosweb + asztali indító
set -euo pipefail

SOURCE="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$HOME/Downloads/autosweb"
DESKTOP="$HOME/Desktop/Autosweb-indito.command"

echo "═══════════════════════════════════════"
echo "  Autosweb telepítés"
echo "═══════════════════════════════════════"
echo ""
echo "Forrás:  $SOURCE"
echo "Cél:     $TARGET"
echo ""

mkdir -p "$HOME/Downloads"
mkdir -p "$HOME/Desktop"

if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete --exclude node_modules --exclude .DS_Store "$SOURCE/" "$TARGET/"
else
  rm -rf "$TARGET"
  mkdir -p "$TARGET"
  cp -R "$SOURCE/." "$TARGET/"
  rm -rf "$TARGET/node_modules" "$TARGET/mac/telepites.command" 2>/dev/null || true
fi

cd "$TARGET"
npm install

cat > "$DESKTOP" << 'LAUNCHER'
#!/bin/bash
cd "$HOME/Downloads/autosweb" || {
  osascript -e 'display alert "Autosweb" message "Nincs telepítve! Futtasd: bocsa-app/autosweb/mac/telepites.command"'
  exit 1
}
if [ ! -d node_modules ]; then
  npm install
fi
open "http://127.0.0.1:3456"
echo "Autosweb: http://127.0.0.1:3456"
echo "Bezáráshoz: Ctrl+C"
npm start
LAUNCHER

chmod +x "$DESKTOP"
chmod +x "$TARGET/mac/telepites.command" 2>/dev/null || true

echo ""
echo "✓ Kész!"
echo "  Mappa:   $TARGET"
echo "  Indító:  $DESKTOP"
echo ""
echo "Dupla kattintás az asztalon: Autosweb-indito.command"
read -r -p "Nyomj ENTER-t a bezáráshoz…" _
