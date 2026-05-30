#!/usr/bin/env bash
# Dev szerver tiszta indítás (.next cache törlése).
set -euo pipefail
cd "$(dirname "$0")/.."

for pid in $(lsof -ti :3000 2>/dev/null || true); do
  kill -9 "$pid" 2>/dev/null || true
done

rm -rf .next
echo "→ .next törölve, dev indul…"
exec npm run dev
