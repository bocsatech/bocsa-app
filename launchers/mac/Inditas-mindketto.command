#!/bin/bash
# BOCSA Pro — mindkét program egyszerre (Asztalról, Terminalban)
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
[ -f "${HOME}/.zprofile" ] && source "${HOME}/.zprofile" 2>/dev/null || true
[ -f "${HOME}/.zshrc" ] && source "${HOME}/.zshrc" 2>/dev/null || true

REPO=""
if [ -f "${HOME}/Desktop/.bocsa-pro-repo" ]; then
  REPO="$(tr -d '\r' < "${HOME}/Desktop/.bocsa-pro-repo" | head -n 1)"
elif [ -f "${HOME}/.bocsa-pro/repo-path" ]; then
  REPO="$(tr -d '\r' < "${HOME}/.bocsa-pro/repo-path" | head -n 1)"
fi

if [ -z "$REPO" ] || [ ! -d "$REPO/willhaben-pro" ] || [ ! -d "$REPO/hasznaltauto-pro" ]; then
  echo ""
  echo "HIBA: Nem találom a bocsa-app mappát."
  echo "Futtasd egyszer: bocsa-app / Asztalra telepites.command"
  echo ""
  read -r -p "Enter..."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "HIBA: npm nincs telepítve — https://nodejs.org/"
  read -r -p "Enter..."
  exit 1
fi

echo ""
echo "BOCSA Pro indul..."
echo "  Willhaben Pro   → http://127.0.0.1:3847"
echo "  Hasznaltauto Pro → http://127.0.0.1:3848"
echo "  (caffeinate — gép nem alszik el)"
echo ""

WH_DIR="$REPO/willhaben-pro"
HA_DIR="$REPO/hasznaltauto-pro"

/usr/bin/osascript -e 'tell application "Terminal" to activate' \
  -e "tell application \"Terminal\" to do script \"cd \" & quoted form of \"$WH_DIR\" & \" && echo '=== Willhaben Pro ===' && exec caffeinate -dims npm start\""

sleep 1

/usr/bin/osascript -e "tell application \"Terminal\" to do script \"cd \" & quoted form of \"$HA_DIR\" & \" && echo '=== Hasznaltauto Pro ===' && exec caffeinate -dims npm start\""

echo ""
echo "Kész — 2 Terminal ablak nyílt."
echo ""
read -r -p "Enter bezáráshoz..."
