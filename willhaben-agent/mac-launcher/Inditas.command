#!/bin/bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

PRO_DIR="${HOME}/Downloads/Willhaben Agent"
if [ ! -f "$PRO_DIR/package.json" ]; then
  d="$(cd "$(dirname "$0")/.." && pwd)"
  [ -f "$d/package.json" ] && PRO_DIR="$d"
fi

[ -f "$PRO_DIR/package.json" ] || { echo "Hiányzik: $PRO_DIR"; read -r; exit 1; }
cd "$PRO_DIR"
echo "Willhaben Agent — http://127.0.0.1:3860"
exec caffeinate -dims npm start
