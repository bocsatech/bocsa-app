#!/bin/bash
# BOCSA Pro — egy kattintás (app bundle)
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

REPO=""
for f in \
  "$(dirname "$0")/../Resources/repo-path.txt" \
  "${HOME}/Desktop/.bocsa-pro-repo" \
  "${HOME}/.bocsa-pro/repo-path"; do
  if [ -f "$f" ]; then
    REPO="$(tr -d '\r' < "$f" | head -n 1)"
    if [ -n "$REPO" ] && [ -f "$REPO/launchers/mac/start-all.sh" ]; then
      break
    fi
    REPO=""
  fi
done

if [ -z "$REPO" ]; then
  /usr/bin/osascript -e 'display alert "BOCSA Pro" message "Nem találom a projekt mappát. Futtasd újra: Asztalra telepites.command" as critical' 2>/dev/null || true
  exit 1
fi

exec "$REPO/launchers/mac/start-all.sh"
