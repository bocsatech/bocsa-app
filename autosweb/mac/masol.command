#!/bin/bash
# Közvetlen másolás a helyi bocsa-app/autosweb → ~/Letöltések/autosweb
# NEM húz a main-ről — a jelenlegi repo állapotot másolja.
set -euo pipefail

SOURCE="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=/dev/null
source "$(dirname "$0")/_target.sh"
TARGET="$(autosweb_target)"

echo "Autosweb másolás (helyi forrás → Letöltések)…"
echo "  Forrás: $SOURCE"
echo "  Cél:    $TARGET"
echo ""

if [ ! -f "$SOURCE/lib/jarmu-katalogus.mjs" ]; then
  echo "✗ Hiányzik a járműkatalógus kód a forrásból."
  echo "  Először: cd ~/bocsa-app && git pull origin cursor/mentesmarka-csv-katalogus-2aa0"
  exit 1
fi

mkdir -p "$TARGET"
cp "$SOURCE/package.json" "$SOURCE/server.mjs" "$TARGET/"
rsync -a --delete "$SOURCE/lib/" "$TARGET/lib/"
cp -R "$SOURCE/scripts" "$TARGET/" 2>/dev/null || true
"$(dirname "$0")/rsync-public-preserve-images.sh" "$SOURCE" "$TARGET"

cd "$TARGET"
node scripts/embed-ad-form.mjs 2>/dev/null || true

VER=$(cat "$TARGET/public/version.txt" 2>/dev/null || echo "HIÁNYZIK")
echo ""
echo "✓ Másolva: $TARGET"
echo "  Verzió: $VER"

if [ ! -f "$TARGET/lib/jarmu-katalogus.mjs" ]; then
  echo "  ✗ HIBA: jarmu-katalogus.mjs nincs a célban!"
  exit 1
fi
if ! grep -q 'jarmu-katalogus-ui' "$TARGET/public/js/form-core.js" 2>/dev/null; then
  echo "  ✗ HIBA: form-core.js nem köti a katalógust!"
  exit 1
fi
if ! grep -q '<select id="modell"' "$TARGET/public/hirdetesfeladas.html" 2>/dev/null; then
  echo "  ✗ HIBA: modell még nem select a hirdetesfeladas.html-ben!"
  exit 1
fi
echo "  ✓ Járműkatalógus (Gyártmány/Modell/Típus) OK"

cp "$(dirname "$0")/Autosweb-indito.command" "$HOME/Desktop/Autosweb-indito.command" 2>/dev/null || true
chmod +x "$HOME/Desktop/Autosweb-indito.command" 2>/dev/null || true
echo "  ✓ Asztali indító frissítve"

if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti:3456 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "  ⚠ Port 3456 foglalt — leállítás…"
    kill -9 $PIDS 2>/dev/null || true
    sleep 1
  fi
fi

echo ""
echo "Következő:"
echo "  1) ~/Desktop/Autosweb-indito.command"
echo "  2) http://127.0.0.1:3456/hirdetesfeladas.html"
echo "  3) Cmd+Shift+R"
echo ""
echo "Katalógus CSV kell: ~/Letöltések/mentesmarka/jarmu-katalogus.csv"
