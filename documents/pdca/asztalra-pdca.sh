#!/bin/bash
# PDCA német kép letöltése az Asztalra (Mac)
curl -L --fail -o "${HOME}/Desktop/pdca.png" \
  "https://github.com/bocsatech/bocsa-app/raw/main/documents/pdca/pdca.png"
echo "Kész: ${HOME}/Desktop/pdca.png"
open "${HOME}/Desktop/pdca.png"
