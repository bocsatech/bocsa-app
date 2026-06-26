#!/usr/bin/env bash
# Dev szerver tiszta indítás (.next cache teljes törlése).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for port in 3000 3001; do
  pids="$(lsof -ti :"$port" 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "→ Port $port felszabadítása…"
    kill -9 $pids 2>/dev/null || true
  fi
done

rm -rf .next node_modules/.cache
echo "→ .next + webpack cache törölve, dev indul…"
exec bash scripts/dev.sh
