#!/bin/bash
# BOCSA Pro — Pro Orchestrator (Asztalról, Terminalban)
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

if [ -z "$REPO" ] || [ ! -d "$REPO/pro-orchestrator" ]; then
  echo ""
  echo "HIBA: Nem találom a bocsa-app / pro-orchestrator mappát."
  echo "Futtasd egyszer: bocsa-app / Asztalra telepites.command"
  echo "Majd: git pull (cursor/pro-orchestrator-1db0 ág)"
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
echo "Pro Orchestrator indul..."
echo "  Vezérlő → http://127.0.0.1:3850"
echo "  Slotok indítása: böngészőben ▶ Indítás gomb"
echo "  (caffeinate — gép nem alszik el)"
echo ""

ORCH_DIR="$REPO/pro-orchestrator"

/usr/bin/osascript -e 'tell application "Terminal" to activate' \
  -e "tell application \"Terminal\" to do script \"cd \" & quoted form of \"$ORCH_DIR\" & \" && echo '=== Pro Orchestrator ===' && exec caffeinate -dims npm start\""

echo ""
echo "Kész — Terminal ablak nyílt. Nyisd meg: http://127.0.0.1:3850"
echo ""
read -r -p "Enter bezáráshoz..."
