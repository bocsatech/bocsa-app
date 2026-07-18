#!/bin/bash
# Interaktív SSH a BOCSA Pro szerverre
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$DIR/config.env"

if [ ! -f "$CONFIG" ]; then
  echo "Hiányzik: $CONFIG"
  exit 1
fi

# shellcheck disable=SC1090
source "$CONFIG"

: "${BOCSA_SERVER_HOST:?BOCSA_SERVER_HOST}"
: "${BOCSA_SSH_USER:?BOCSA_SSH_USER}"

SSH_OPTS=()
if [ -n "${BOCSA_SSH_KEY:-}" ]; then
  SSH_OPTS+=(-i "$BOCSA_SSH_KEY")
fi

exec ssh "${SSH_OPTS[@]}" "${BOCSA_SSH_USER}@${BOCSA_SERVER_HOST}"
