#!/bin/bash
# Közvetlen másolás Downloads-ba — git nélkül is, ha a forrás friss
set -euo pipefail

SOURCE="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$HOME/Downloads/autosweb"

if [ ! -d "$TARGET" ]; then
  echo "Először: ./telepites.command"
  exit 1
fi

cp "$SOURCE/package.json" "$SOURCE/server.mjs" "$TARGET/"
rsync -a --delete "$SOURCE/lib/" "$TARGET/lib/"
rsync -a --delete "$SOURCE/public/" "$TARGET/public/"

VER=$(cat "$TARGET/public/version.txt" 2>/dev/null || echo "HIÁNYZIK")
echo ""
echo "✓ Másolva: $TARGET"
echo "  Verzió: $VER"

if [ ! -f "$TARGET/public/css/site-app.css" ]; then
  echo "  ✗ HIBA: site-app.css hiányzik!"
  exit 1
fi
if grep -q 'site-app' "$TARGET/public/hirdetesfeladas.html"; then
  echo "  ✓ site-app téma"
else
  echo "  ✗ HIBA: régi HTML — nincs site-app!"
  exit 1
fi

echo ""
echo "Következő lépések:"
echo "  1) Állítsd le a futó Autosweb-et (Ctrl+C)"
echo "  2) Indítsd: ~/Desktop/Autosweb-indito.command"
echo "  3) Böngésző: Cmd+Shift+R"
