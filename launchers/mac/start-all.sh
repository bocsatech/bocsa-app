#!/bin/bash
# BOCSA Pro — egy kattintás: orchestrator + slotok automatikusan
set -u

LOG="${HOME}/Desktop/BOCSA-Pro.log"
PIDFILE="${HOME}/.bocsa-pro/orchestrator.pid"
mkdir -p "${HOME}/.bocsa-pro"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
[ -f "${HOME}/.zprofile" ] && source "${HOME}/.zprofile" 2>/dev/null || true
[ -f "${HOME}/.zshrc" ] && source "${HOME}/.zshrc" 2>/dev/null || true

alert() {
  /usr/bin/osascript -e "display alert \"BOCSA Pro\" message \"$1\" as critical" 2>/dev/null || true
}

notify() {
  /usr/bin/osascript -e "display notification \"$1\" with title \"BOCSA Pro\"" 2>/dev/null || true
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
  alert "Nem találom a bocsa-app mappát. Futtasd egyszer: Asztalra telepites.command"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  alert "npm nincs telepítve. Telepítsd: https://nodejs.org/"
  exit 1
fi

ORCH_DIR="${REPO}/pro-orchestrator"
cd "$ORCH_DIR" || exit 1

echo "===== $(date) — BOCSA Pro egy kattintásos indítás =====" >>"$LOG"

# Korábbi példány leállítása
node src/stop.mjs >>"$LOG" 2>&1 || true
if [ -f "$PIDFILE" ]; then
  oldpid="$(tr -d ' \r' < "$PIDFILE")"
  if [ -n "$oldpid" ]; then
    kill "$oldpid" 2>/dev/null || true
  fi
fi
sleep 1

# Háttérben indul (caffeinate = gép nem alszik)
nohup caffeinate -dims node src/server.mjs >>"$LOG" 2>&1 &
echo $! > "$PIDFILE"

# Várakozás amíg válaszol
ready=0
for _ in $(seq 1 35); do
  if curl -sf "http://127.0.0.1:3850/api/status" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  alert "Az orchestrator nem indult el 35 mp alatt. Nézd: ~/Desktop/BOCSA-Pro.log"
  exit 1
fi

/usr/bin/open "http://127.0.0.1:3850"
notify "Fut — a beállított slotok automatikusan indulnak (http://127.0.0.1:3850)"
exit 0
