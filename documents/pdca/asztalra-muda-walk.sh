#!/bin/bash
# Muda-Walk PowerPoint → Letöltések mappa (Mac)
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${HOME}/Downloads/Muda-Walk.pptx"
node "${ROOT}/scripts/generate-muda-walk-pptx.mjs" "${OUT}"
echo "Kész: ${OUT}"
open "${OUT}" 2>/dev/null || true
