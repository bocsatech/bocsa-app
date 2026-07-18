#!/bin/bash
# Frissítés: git → kliens scriptek ~/Downloads/bocsa Pro linux
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="$HOME/Downloads/bocsa Pro linux"

echo "BOCSA Pro Linux kliens frissítés…"

if [ ! -d "$TARGET" ]; then
  echo "Nincs telepítve. Futtasd: ./telepites.sh"
  exit 1
fi

cd "$REPO"
git fetch origin main 2>/dev/null || true
git pull origin main -- pro-orchestrator/linux/ 2>/dev/null || git checkout origin/main -- pro-orchestrator/linux/

"$SCRIPT_DIR/masol.sh"

echo ""
echo "✓ Frissítve. Indítás: ~/Desktop/bocsa-pro-linux-indito.sh"
