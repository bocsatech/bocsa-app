#!/bin/bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

PRO_DIR="${HOME}/Downloads/mobilede pro"
if [ ! -f "$PRO_DIR/package.json" ]; then
  APP_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
  CANDIDATE="$(dirname "$APP_ROOT")"
  if [ -f "$CANDIDATE/package.json" ]; then
    PRO_DIR="$CANDIDATE"
  fi
fi

if ! command -v npm >/dev/null 2>&1; then
  osascript -e 'display alert "Node.js / npm nincs telepítve" message "Telepítsd innen: https://nodejs.org/" as critical' 2>/dev/null || true
  echo "Node.js / npm nincs telepítve: https://nodejs.org/"
  read -r -p "Enter..."
  exit 1
fi

if [ ! -f "$PRO_DIR/package.json" ]; then
  osascript -e "display alert \"Nem találom a Mobile.de Pro mappát\" message \"${PRO_DIR}\" as critical" 2>/dev/null || true
  echo "Nem találom: $PRO_DIR/package.json"
  read -r -p "Enter..."
  exit 1
fi

CMD="cd $(printf '%q' "$PRO_DIR") && caffeinate -dims npm start"

osascript <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "$CMD"
end tell
APPLESCRIPT
