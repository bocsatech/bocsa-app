#!/bin/bash
# Pro Orchestrator — 6 slotos vezérlő (caffeinate: gép nem alszik)
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
      if [ -n "$repo" ] && [ -d "$repo/pro-orchestrator" ]; then
        echo "$repo"
        return 0
      fi
    fi
  done
  return 1
}

REPO="$(find_repo || true)"
if [ -z "$REPO" ]; then
  alert "Nem találom a bocsa-app mappát (pro-orchestrator). Futtasd újra: Asztalra telepites.command"
  exit 1
fi

echo "REPO=$REPO"

if ! command -v npm >/dev/null 2>&1; then
  alert "npm nincs telepítve. Telepítsd: https://nodejs.org/"
  exit 1
fi

ORCH_DIR="${REPO}/pro-orchestrator"

if ! /usr/bin/osascript <<APPLESCRIPT; then
tell application "Terminal"
  activate
  do script "cd " & quoted form of "$ORCH_DIR" & " && clear && echo '=== Pro Orchestrator — http://127.0.0.1:3850 ===' && echo 'Slotok: Indítás gomb a böngészőben. Leállítás: npm run stop' && exec caffeinate -dims npm start"
end tell
APPLESCRIPT
  alert "Terminal indítás sikertelen. Nézd: ~/Desktop/BOCSA-Pro-inditas.log"
  exit 1
fi

echo "OK — Pro Orchestrator Terminal elindítva"
exit 0
