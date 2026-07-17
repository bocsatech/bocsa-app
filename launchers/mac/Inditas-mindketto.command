#!/bin/bash
# BOCSA Pro — egy kattintás, minden indul (Asztalról)
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

REPO=""
if [ -f "${HOME}/Desktop/.bocsa-pro-repo" ]; then
  REPO="$(tr -d '\r' < "${HOME}/Desktop/.bocsa-pro-repo" | head -n 1)"
elif [ -f "${HOME}/.bocsa-pro/repo-path" ]; then
  REPO="$(tr -d '\r' < "${HOME}/.bocsa-pro/repo-path" | head -n 1)"
fi

if [ -z "$REPO" ] || [ ! -f "$REPO/launchers/mac/start-all.sh" ]; then
  /usr/bin/osascript -e 'display alert "BOCSA Pro" message "Nem találom a bocsa-app mappát. Futtasd: Asztalra telepites.command" as critical' 2>/dev/null || true
  exit 1
fi

exec "$REPO/launchers/mac/start-all.sh"
