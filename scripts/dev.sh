#!/usr/bin/env bash
# Stabil dev indítás: webpack + automatikus sérült .next cache törlés.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

stop_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti :"$port" 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    kill -9 $pids 2>/dev/null || true
  fi
}

stop_port 3000
stop_port 3001

# Turbopack cache sérülés → GET /login 404 vagy 500.
manifest=".next/dev/server/app/login/page/build-manifest.json"
if [[ -d .next && ! -f "$manifest" ]]; then
  echo "→ Sérült .next cache törölve (404/500 javítás)…"
  rm -rf .next
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Dev szerver indul…"
echo ""
echo "  A „Ready in …ms” UTÁN a terminál NEM áll le —"
echo "  ez normális: a szerver fut és várja a böngészőt."
echo ""
echo "  Nyisd meg:  http://localhost:3000/login"
echo "  Leállítás:  Ctrl+C  (Mac: ugyanez)"
echo ""
echo "  Teszt (másik terminál ablakban, Ready után):"
echo "    npm run test:local"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exec npx next dev --webpack "$@"
