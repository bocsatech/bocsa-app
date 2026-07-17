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

echo "✓ Másolva: $TARGET"
grep -n "field-row--vehicle-top" "$TARGET/public/hirdetesfeladas.html" && echo "(OK: 3 mező egy sorban)" || echo "(HIBA: régi HTML!)"
