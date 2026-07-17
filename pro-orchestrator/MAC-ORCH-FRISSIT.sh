#!/usr/bin/env bash
# BOCSA Pro Orchestrator — gyors frissítés git nélkül (curl)
set -euo pipefail

ORCH="${HOME}/Downloads/bocsa-orchestrator"
BASE="https://raw.githubusercontent.com/bocsatech/bocsa-app/main/pro-orchestrator"
mkdir -p "${ORCH}/src" "${ORCH}/public" "${ORCH}/scripts"

echo "→ Orchestrator frissítés: ${ORCH}"

fetch() {
  curl -sf "${BASE}/$1" -o "${ORCH}/$1"
}

fetch "src/server.mjs"
fetch "src/slots.mjs"
fetch "src/config.mjs"
fetch "src/program-paths.mjs"
fetch "public/index.html"
fetch "scripts/test-slot-urls.mjs"

echo "✓ Fájlok letöltve (v0.8.2+ URL mentés javítás)"
echo ""
echo "Következő lépések:"
echo "  1. Állítsd le a futó orchestratort (Ctrl+C a terminálban)"
echo "  2. Indítsd újra: cd \"${ORCH}\" && node src/server.mjs"
echo "  3. Böngészőben kemény frissítés: Cmd+Shift+R / Ctrl+Shift+R"
echo "  4. Slotnál: ■ Leállítás → ✕ töröl → új URL → 💾 Mentés → ↻ Újraindítás"
