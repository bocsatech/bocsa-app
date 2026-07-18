#!/bin/bash
# Frissítés: GitHub main → ~/Downloads/bocsa Pro linux
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE="$REPO/pro-orchestrator"
TARGET="$HOME/Downloads/bocsa Pro linux"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "BOCSA Pro Linux frissítés…"
echo "  Repo: $REPO"
echo ""

if [ ! -d "$TARGET" ]; then
  echo "Nincs telepítve. Futtasd: ./telepites.sh"
  exit 1
fi

cd "$REPO"
git fetch origin main
git pull origin main -- pro-orchestrator/ 2>/dev/null || git checkout origin/main -- pro-orchestrator/

"$SCRIPT_DIR/masol.sh"

echo ""
echo "✓ Frissítve: $TARGET"
echo "  1) Állítsd le a futó BOCSA Pro-t (Ctrl+C)"
echo "  2) Indítsd: ~/Desktop/bocsa-pro-linux-indito.sh"
echo "  3) Böngésző: Ctrl+Shift+R"
