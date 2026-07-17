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
rsync -a --delete "$SOURCE/public/" "$TARGET/public/"

VER=$(cat "$TARGET/public/version.txt" 2>/dev/null || echo "HIÁNYZIK")
echo ""
echo "✓ Másolva: $TARGET"
echo "  Verzió: $VER"

if [ ! -f "$TARGET/public/css/automax.css" ]; then
  echo "  ✗ HIBA: automax.css hiányzik!"
  exit 1
fi
if grep -q 'theme-automax' "$TARGET/public/hirdetesfeladas.html"; then
  echo "  ✓ AUTOMAX téma (theme-automax)"
else
  echo "  ✗ HIBA: régi HTML — nincs theme-automax!"
  exit 1
fi

echo ""
echo "Következő lépések:"
echo "  1) Állítsd le a futó Autosweb-et (Ctrl+C)"
echo "  2) Indítsd: ~/Desktop/Autosweb-indito.command"
echo "  3) Böngésző: Cmd+Shift+R"
