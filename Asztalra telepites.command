#!/bin/bash
# Egyszer futtasd — az Asztalra kerül a „BOCSA Pro Indítás.app” ikon.
set -euo pipefail
cd "$(dirname "$0")"
chmod +x scripts/install-desktop-launcher.sh
./scripts/install-desktop-launcher.sh
echo ""
read -r -p "Enter bezáráshoz..."
