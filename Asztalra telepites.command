#!/bin/bash
# Egyszer futtasd — ikonok az Asztalra (Asztal / Desktop automatikus felismerés).
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE" || exit 1

echo ""
echo "BOCSA Pro — Asztali telepítő"
echo "Mappa: $HERE"
echo ""

if [ ! -d "$HERE/willhaben-pro" ] || [ ! -d "$HERE/hasznaltauto-pro" ]; then
  echo "HIBA: Ez nem a bocsa-app mappa."
  echo "Előbb: cd a bocsa-app könyvtárba, majd dupla kattintás ide."
  read -r -p "Enter..."
  exit 1
fi

if [ ! -f "$HERE/scripts/install-desktop-launcher.sh" ]; then
  echo "HIBA: Hiányzik a telepítő script."
  echo "Futtasd: git pull origin cursor/hasznaltauto-pro-1db0"
  read -r -p "Enter..."
  exit 1
fi

chmod +x "$HERE/scripts/install-desktop-launcher.sh"
bash "$HERE/scripts/install-desktop-launcher.sh"
