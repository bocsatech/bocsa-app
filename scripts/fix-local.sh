#!/usr/bin/env bash
# Gyors javítás 404/500 esetén — git pull nélkül is működik.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for port in 3000 3001; do
  pids="$(lsof -ti :"$port" 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    kill -9 $pids 2>/dev/null || true
  fi
done

rm -rf .next
echo "→ .next törölve"
echo "→ Dev szerver indul (webpack)…"
exec npx next dev --webpack "$@"
