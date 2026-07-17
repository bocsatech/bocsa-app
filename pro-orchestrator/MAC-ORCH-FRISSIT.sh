#!/usr/bin/env bash
# BOCSA Pro Orchestrator + Willhaben Pro — gyors frissítés git nélkül (curl)
set -euo pipefail

ORCH="${HOME}/Downloads/bocsa-orchestrator"
WH="${HOME}/Downloads/willhaben pro"
ORCH_BASE="https://raw.githubusercontent.com/bocsatech/bocsa-app/main/pro-orchestrator"
WH_BASE="${ORCH_BASE}/vendor/willhaben-pro"

mkdir -p "${ORCH}/src" "${ORCH}/public" "${ORCH}/scripts"
mkdir -p "${WH}/src"

echo "→ Orchestrator frissítés: ${ORCH}"

fetch_orch() {
  curl -sf "${ORCH_BASE}/$1" -o "${ORCH}/$1"
}

fetch_orch "src/server.mjs"
fetch_orch "src/slots.mjs"
fetch_orch "src/config.mjs"
fetch_orch "src/auto-start.mjs"
fetch_orch "src/program-paths.mjs"
fetch_orch "src/ensure-calibration-fix.mjs"
fetch_orch "public/index.html"
fetch_orch "scripts/test-slot-urls.mjs"

echo "→ Willhaben Pro frissítés: ${WH}"

fetch_wh() {
  curl -sf "${WH_BASE}/$1" -o "${WH}/$1"
}

for f in \
  src/index.mjs \
  src/message.mjs \
  src/exclude-keywords.mjs \
  src/ad-detail.mjs \
  src/admin-server.mjs \
  config.default.json; do
  fetch_wh "$f"
done

echo "✓ Fájlok letöltve (v0.8.3 — kizáró szavak + slot bezárás)"
echo ""
echo "Következő lépések:"
echo "  1. Állítsd le a futó orchestratort (Ctrl+C)"
echo "  2. Indítsd újra: cd \"${ORCH}\" && node src/server.mjs"
echo "  3. Böngészőben kemény frissítés: Cmd+Shift+R / Ctrl+Shift+R"
echo "  4. Willhaben slot: 💾 Mentés (kizáró szavak) → ■ Leállítás → ↻ Újraindítás"
