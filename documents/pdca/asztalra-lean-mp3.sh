#!/bin/bash
# PDCA Lean – magyarázó MP3 letöltése az Asztalra (Mac)
# Dupla kattintás vagy: bash asztalra-lean-mp3.sh

set -e
DESKTOP="${HOME}/Desktop"
URL="https://github.com/bocsatech/bocsa-app/raw/main/documents/pdca/lean-management-magyarazo.mp3"
OUT="${DESKTOP}/lean-management-magyarazo.mp3"

echo "Letöltés az Asztalra..."
curl -L --fail -o "${OUT}" "${URL}"
echo "Kész: ${OUT}"
open "${OUT}"
