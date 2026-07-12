#!/bin/bash
# Hasznaltauto Pro — Terminal indítás, gép ébren tartása, npm start
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js / npm nincs telepítve: https://nodejs.org/"
  read -r -p "Enter..."
  exit 1
fi

echo "Hasznaltauto Pro indul (caffeinate — a gép nem alszik el)..."
echo "Admin: http://127.0.0.1:3848"
echo "Leállítás: npm run stop vagy zárd be ezt az ablakot."
echo ""

exec caffeinate -dims npm start
