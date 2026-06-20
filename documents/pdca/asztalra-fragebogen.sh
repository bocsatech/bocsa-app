#!/bin/bash
# Fragebogen Lean Management (DE/HU) PDF → Letöltések mappa (Mac)
# Dupla kattintás vagy: bash documents/pdca/asztalra-fragebogen.sh

set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${HOME}/Downloads/Fragebogen_Lean_Management_Musterloesung_DE_HU.pdf"

echo "PDF generálás..."
node "${ROOT}/scripts/generate-lean-fragebogen-pdf.mjs" "${OUT}"

echo "Kész: ${OUT}"
open "${OUT}" 2>/dev/null || true
