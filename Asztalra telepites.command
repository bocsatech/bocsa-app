#!/bin/bash
# Egyszer futtasd — ikonok az Asztalra (Asztal / Desktop automatikus felismerés).
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE" || exit 1

echo ""
echo "BOCSA Pro — Asztali telepítő"
echo "Mappa: $HERE"
echo ""

if [ ! -d "$HERE/pro-orchestrator" ] && [ ! -d "$HERE/hasznaltauto-pro" ]; then
  echo "HIBA: Hiányzik a pro-orchestrator vagy hasznaltauto-pro mappa."
  echo "Próbáld: curl -sf https://raw.githubusercontent.com/bocsatech/bocsa-app/main/pro-orchestrator/MAC-ASZTAL-TELEPITES.sh | bash"
  read -r -p "Enter..."
  exit 1
fi

if [ -f "$HERE/pro-orchestrator/MAC-ASZTAL-TELEPITES.sh" ]; then
  exec bash "$HERE/pro-orchestrator/MAC-ASZTAL-TELEPITES.sh"
fi

if [ ! -f "$HERE/scripts/install-desktop-launcher.sh" ]; then
  echo "HIBA: Hiányzik a telepítő script."
  read -r -p "Enter..."
  exit 1
fi

chmod +x "$HERE/scripts/install-desktop-launcher.sh"
bash "$HERE/scripts/install-desktop-launcher.sh"
