#!/bin/bash
# Frissítés: csak HTML/CSS/JS + szerver (node_modules marad)
set -euo pipefail

SOURCE="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$HOME/Downloads/autosweb"

if [ ! -d "$TARGET" ]; then
  echo "Nincs telepítve. Futtasd: ./telepites.command"
  exit 1
fi

cp "$SOURCE/package.json" "$SOURCE/server.mjs" "$TARGET/"
rsync -a --delete "$SOURCE/public/" "$TARGET/public/"

echo "Frissítve: $TARGET/public"
echo "Indítsd újra az Autosweb-indito.command fájlt, majd Cmd+Shift+R a böngészőben."
