#!/bin/bash
# SSH tunell leállítása
set -euo pipefail

PIDFILE="${XDG_STATE_HOME:-$HOME/.local/state}/bocsa-pro-linux-tunnel.pid"
DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$DIR/config.env"

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE" 2>/dev/null || true)
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    echo "Tunell leállítva (PID $PID)."
  fi
  rm -f "$PIDFILE"
else
  echo "Nincs mentett tunell PID."
fi

if [ -f "$CONFIG" ]; then
  # shellcheck disable=SC1090
  source "$CONFIG"
  BOCSA_LOCAL_PORT="${BOCSA_LOCAL_PORT:-3850}"
  if command -v lsof >/dev/null 2>&1; then
    PIDS=$(lsof -ti:"$BOCSA_LOCAL_PORT" 2>/dev/null || true)
    [ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null && echo "Port $BOCSA_LOCAL_PORT felszabadítva."
  fi
fi
