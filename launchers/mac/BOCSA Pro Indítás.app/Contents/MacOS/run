#!/bin/bash
# Mindkét program egyszerre: Willhaben Pro + Hasznaltauto Pro
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_FILE="$SCRIPT_DIR/../Resources/repo-path.txt"

if [ -f "$REPO_FILE" ]; then
  REPO="$(tr -d '\r' < "$REPO_FILE" | head -n 1)"
else
  REPO=""
fi

if [ -z "$REPO" ] || [ ! -d "$REPO/willhaben-pro" ] || [ ! -d "$REPO/hasznaltauto-pro" ]; then
  osascript -e 'display alert "BOCSA Pro — rossz útvonal" message "Futtasd újra: Asztalra telepites.command a bocsa-app mappában, majd az Asztalon dupla kattintás." as critical' 2>/dev/null || true
  echo "Nem találom a projektet. Telepítsd az asztalra: ./scripts/install-desktop-launcher.sh"
  read -r -p "Enter..."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  osascript -e 'display alert "Node.js / npm nincs telepítve" message "https://nodejs.org/" as critical' 2>/dev/null || true
  exit 1
fi

WH_DIR="$REPO/willhaben-pro"
HA_DIR="$REPO/hasznaltauto-pro"

WH_CMD="cd $(printf '%q' "$WH_DIR") && echo '=== Willhaben Pro — admin http://127.0.0.1:3847 ===' && caffeinate -dims npm start"
HA_CMD="cd $(printf '%q' "$HA_DIR") && echo '=== Hasznaltauto Pro — admin http://127.0.0.1:3848 ===' && caffeinate -dims npm start"

osascript <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "$WH_CMD"
  delay 0.8
  do script "$HA_CMD"
end tell
APPLESCRIPT
