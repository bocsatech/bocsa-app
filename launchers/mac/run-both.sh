#!/bin/bash
# Mindkét program: Willhaben Pro + Hasznaltauto Pro
# Napló: ~/Desktop/BOCSA-Pro-inditas.log

LOG="${HOME}/Desktop/BOCSA-Pro-inditas.log"
exec >>"$LOG" 2>&1
echo "===== $(date) ====="

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
[ -f "${HOME}/.zprofile" ] && source "${HOME}/.zprofile" 2>/dev/null || true
[ -f "${HOME}/.zshrc" ] && source "${HOME}/.zshrc" 2>/dev/null || true

alert() {
  /usr/bin/osascript -e "display alert \"BOCSA Pro\" message \"$1\" as critical" 2>/dev/null || true
}

find_repo() {
  local f repo=""
  for f in \
    "${HOME}/Desktop/.bocsa-pro-repo" \
    "${HOME}/.bocsa-pro/repo-path" \
    "$(dirname "$0")/../Resources/repo-path.txt" \
    "$(dirname "$0")/../../.bocsa-pro-repo"; do
    if [ -f "$f" ]; then
      repo="$(tr -d '\r' < "$f" | head -n 1)"
      if [ -n "$repo" ] && [ -d "$repo/hasznaltauto-pro" ]; then
        echo "$repo"
        return 0
      fi
    fi
  done
  return 1
}

REPO="$(find_repo || true)"
if [ -z "$REPO" ]; then
  alert "Nem találom a bocsa-app mappát. Futtasd újra: Asztalra telepites.command"
  exit 1
fi

echo "REPO=$REPO"

if ! command -v npm >/dev/null 2>&1; then
  alert "npm nincs telepítve. Telepítsd: https://nodejs.org/ majd futtasd újra az Asztalra telepites.command-ot."
  exit 1
fi

WH_DIR="${HOME}/Downloads/willhaben pro"
HA_DIR="${REPO}/hasznaltauto-pro"

if [ ! -d "$WH_DIR" ] || [ ! -f "$WH_DIR/package.json" ]; then
  alert "Willhaben Pro nincs a Letöltések mappában. Futtasd: bash scripts/move-willhaben-pro-to-downloads.sh"
  exit 1
fi

launch_terminal() {
  local dir="$1"
  local title="$2"
  /usr/bin/osascript <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "cd " & quoted form of "$dir" & " && clear && echo '$title' && echo 'Leállítás: npm run stop vagy zárd be az ablakot.' && exec caffeinate -dims npm start"
end tell
APPLESCRIPT
}

if ! launch_terminal "$WH_DIR" "=== Willhaben Pro — http://127.0.0.1:3847 ==="; then
  alert "Terminal indítás sikertelen (Willhaben). Nézd: ~/Desktop/BOCSA-Pro-inditas.log"
  exit 1
fi

sleep 1

if ! launch_terminal "$HA_DIR" "=== Hasznaltauto Pro — http://127.0.0.1:3848 ==="; then
  alert "Terminal indítás sikertelen (Hasznaltauto). Nézd: ~/Desktop/BOCSA-Pro-inditas.log"
  exit 1
fi

echo "OK — mindkét Terminal elindítva"
exit 0
