#!/bin/bash
# Közvetlen másolás → ~/Downloads/bocsa Pro linux (git nélkül is)
set -euo pipefail

SOURCE="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$HOME/Downloads/bocsa Pro linux"

if [ ! -d "$TARGET" ]; then
  echo "Először: ./telepites.sh"
  exit 1
fi

echo "Másolás: $SOURCE → $TARGET"

rsync -a --delete \
  --exclude 'MAC-*.sh' \
  --exclude 'vendor/' \
  --exclude 'linux/' \
  --exclude 'node_modules/' \
  --exclude '.git/' \
  "$SOURCE/package.json" \
  "$SOURCE/config.json" \
  "$SOURCE/src/" \
  "$SOURCE/public/" \
  "$TARGET/"

if [ -d "$SOURCE/scripts" ]; then
  rsync -a --delete "$SOURCE/scripts/" "$TARGET/scripts/"
fi

if [ -f "$SOURCE/package.json" ] && grep -q '"version"' "$TARGET/package.json"; then
  VER=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' "$TARGET/package.json" | head -1)
  echo "  $VER"
fi

if [ ! -f "$TARGET/src/server.mjs" ]; then
  echo "  ✗ HIBA: hiányzik src/server.mjs"
  exit 1
fi

echo "✓ Másolva: $TARGET"
