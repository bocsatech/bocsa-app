#!/bin/bash
# Willhaben Pro — Terminal indítás (Desktopról is működik)
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

PRO_DIR="${HOME}/Downloads/willhaben pro"
if [ ! -f "$PRO_DIR/package.json" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  if [ -f "$SCRIPT_DIR/../package.json" ]; then
    PRO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
  fi
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js / npm nincs telepítve: https://nodejs.org/"
  read -r -p "Enter..."
  exit 1
fi

if [ ! -f "$PRO_DIR/package.json" ]; then
  echo "❌ Nem találom: ${PRO_DIR}/package.json"
  echo "   Telepítés:"
  echo "   curl -sf https://raw.githubusercontent.com/bocsatech/bocsa-app/main/scripts/MAC-TELEPIT-MINDEN.sh | bash"
  read -r -p "Enter..."
  exit 1
fi

cd "$PRO_DIR"
echo "Willhaben Pro indul (caffeinate — a gép nem alszik el)..."
echo "Mappa: $PRO_DIR"
echo "Admin: http://127.0.0.1:3847 (orchestrator slotnál más port)"
echo "Leállítás: npm run stop vagy zárd be ezt az ablakot."
echo ""

exec caffeinate -dims npm start
