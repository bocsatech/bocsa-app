#!/bin/bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

PRO_DIR="${HOME}/Downloads/willhaben agent"
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
  echo "   bash ~/Downloads/bocsa-app/willhaben-agent/mac/telepites.command"
  read -r -p "Enter..."
  exit 1
fi

cd "$PRO_DIR"
echo "Willhaben Agent indul..."
echo "Mappa: $PRO_DIR"
echo "Web:   http://127.0.0.1:3860"
echo "Leállítás: npm run stop"
echo ""

exec caffeinate -dims npm start
