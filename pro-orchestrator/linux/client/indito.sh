#!/bin/bash
# BOCSA Pro Linux — vékony kliens: SSH tunell + böngésző
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$DIR/config.env"
PIDFILE="${XDG_STATE_HOME:-$HOME/.local/state}/bocsa-pro-linux-tunnel.pid"
LOG="${XDG_STATE_HOME:-$HOME/.local/state}/bocsa-pro-linux.log"

if [ ! -f "$CONFIG" ]; then
  echo "Hiányzik: $CONFIG"
  echo "Másold: config.env.example → config.env és töltsd ki."
  exit 1
fi

# shellcheck disable=SC1090
source "$CONFIG"

: "${BOCSA_SERVER_HOST:?Állítsd be a config.env-ben: BOCSA_SERVER_HOST}"
: "${BOCSA_SSH_USER:?Állítsd be a config.env-ben: BOCSA_SSH_USER}"
BOCSA_REMOTE_PORT="${BOCSA_REMOTE_PORT:-3850}"
BOCSA_LOCAL_PORT="${BOCSA_LOCAL_PORT:-3850}"

SSH_OPTS=(-o "ServerAliveInterval=30" -o "ExitOnForwardFailure=yes")
if [ -n "${BOCSA_SSH_KEY:-}" ]; then
  SSH_OPTS+=(-i "$BOCSA_SSH_KEY")
fi

mkdir -p "$(dirname "$PIDFILE")" "$(dirname "$LOG")"

# Régi tunell leállítása
if [ -f "$PIDFILE" ]; then
  OLD_PID=$(cat "$PIDFILE" 2>/dev/null || true)
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    kill "$OLD_PID" 2>/dev/null || true
    sleep 1
  fi
  rm -f "$PIDFILE"
fi

if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti:"$BOCSA_LOCAL_PORT" 2>/dev/null || true)
  [ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null || true
fi

echo "SSH tunell: localhost:$BOCSA_LOCAL_PORT → $BOCSA_SERVER_HOST:$BOCSA_REMOTE_PORT"
echo "Log: $LOG"

ssh -f -N "${SSH_OPTS[@]}" \
  -L "${BOCSA_LOCAL_PORT}:127.0.0.1:${BOCSA_REMOTE_PORT}" \
  "${BOCSA_SSH_USER}@${BOCSA_SERVER_HOST}" >>"$LOG" 2>&1

# PID keresése (utolsó ssh -N)
TUNNEL_PID=$(pgrep -f "ssh -f -N.*${BOCSA_LOCAL_PORT}:127.0.0.1:${BOCSA_REMOTE_PORT}" | tail -1 || true)
if [ -n "$TUNNEL_PID" ]; then
  echo "$TUNNEL_PID" >"$PIDFILE"
fi

sleep 1
URL="http://127.0.0.1:${BOCSA_LOCAL_PORT}"

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" 2>/dev/null &
elif command -v sensible-browser >/dev/null 2>&1; then
  sensible-browser "$URL" 2>/dev/null &
fi

echo "BOCSA Pro: $URL (szerver: $BOCSA_SERVER_HOST)"
echo "Tunell leállítása: $DIR/leallitas.sh"
