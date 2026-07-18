#!/bin/bash
# BOCSA Pro Linux indító
set -euo pipefail

TARGET="$HOME/Downloads/bocsa Pro linux"
PORT=3850
LOG="${XDG_STATE_HOME:-$HOME/.local/state}/bocsa-pro-linux.log"

cd "$TARGET" || {
  echo "Hiányzik: $TARGET"
  echo "Telepítés: ~/bocsa-app/pro-orchestrator/linux/telepites.sh"
  exit 1
}

if [ ! -f src/server.mjs ]; then
  echo "Hiányzik src/server.mjs — futtasd: frissites.sh"
  exit 1
}

mkdir -p "$(dirname "$LOG")"

if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti:"$PORT" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "Régi szerver leállítása ($PORT)…"
    kill -9 $PIDS 2>/dev/null || true
    sleep 1
  fi
fi

[ ! -d node_modules ] && npm install

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://127.0.0.1:$PORT" 2>/dev/null &
elif command -v sensible-browser >/dev/null 2>&1; then
  sensible-browser "http://127.0.0.1:$PORT" 2>/dev/null &
fi

echo "BOCSA Pro Linux: http://127.0.0.1:$PORT"
echo "Log: $LOG"
echo "Leállítás: Ctrl+C"

exec npm start 2>&1 | tee -a "$LOG"
