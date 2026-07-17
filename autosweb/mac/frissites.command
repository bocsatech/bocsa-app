#!/bin/bash
# Frissítés: GitHub-ról CSAK autosweb → ~/Downloads/autosweb
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE="$REPO/autosweb"
TARGET="$HOME/Downloads/autosweb"

echo "Autosweb frissítés (csak autosweb mappa a GitHub-ról)…"

cd "$REPO"
git fetch origin main
git checkout origin/main -- autosweb/

if [ ! -d "$TARGET" ]; then
  echo "Nincs telepítve. Futtasd: ./telepites.command"
  exit 1
fi

cp "$SOURCE/package.json" "$SOURCE/server.mjs" "$TARGET/"
rsync -a --delete "$SOURCE/public/" "$TARGET/public/"

echo ""
echo "✓ Frissítve: $TARGET"
echo "  1) Állítsd le a futó Autosweb-et (Ctrl+C a terminálban)"
echo "  2) Indítsd újra: Autosweb-indito.command"
echo "  3) Böngésző: Cmd+Shift+R"
