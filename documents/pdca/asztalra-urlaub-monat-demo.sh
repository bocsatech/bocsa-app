#!/bin/bash
# Urlaub Monatsanzeige — Demo-PNG in den Downloads-Ordner (Mac)
# Im Projektordner ausführen:
#   bash documents/pdca/asztalra-urlaub-monat-demo.sh
# oder:
#   npm run demo:urlaub-monat

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${HOME}/Downloads/urlaub-monat-demo.png"
BRANCH="cursor/urlaub-meine-menu-3abb"
RAW_URL="https://github.com/bocsatech/bocsa-app/raw/${BRANCH}/documents/pdca/urlaub-monat-demo.png"

echo "→ Urlaub Monatsanzeige Demo"
echo "  Ziel: ${OUT}"
echo ""

if command -v node >/dev/null 2>&1 && [ -f "${ROOT}/scripts/capture-urlaub-monat-demo.mjs" ]; then
  echo "→ PNG lokal generieren…"
  if node "${ROOT}/scripts/capture-urlaub-monat-demo.mjs" "${OUT}" 2>/dev/null; then
    echo "✓ Kész (lokal generiert): ${OUT}"
    open "${OUT}" 2>/dev/null || true
    exit 0
  fi
  echo "  (Playwright nicht verfügbar — Fallback: GitHub Download)"
fi

echo "→ Download von GitHub…"
curl -L --fail -o "${OUT}" "${RAW_URL}"
echo "✓ Kész (heruntergeladen): ${OUT}"
open "${OUT}" 2>/dev/null || true
