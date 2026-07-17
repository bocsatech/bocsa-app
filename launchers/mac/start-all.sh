#!/bin/bash
# BOCSA Pro Orchestrator — indítás + Safari (3850)
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

ORCH="${HOME}/Downloads/bocsa-orchestrator"
[ -d "$ORCH/src" ] || ORCH="${HOME}/Downloads/bocsa-app/pro-orchestrator"
[ -d "$ORCH/src" ] || { echo "Nincs bocsa-orchestrator — futtasd MAC-TELEPIT-MINDEN.sh"; exit 1; }

NODE=""
for p in /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node 2>/dev/null)"; do
  [ -x "$p" ] && NODE="$p" && break
done
[ -n "$NODE" ] || { echo "Node.js kell"; exit 1; }

cd "$ORCH"
"$NODE" src/stop.mjs 2>/dev/null || true
for port in 3850 3851 3852 3853 3854 3855 3856; do
  lsof -ti :$port 2>/dev/null | xargs kill -9 2>/dev/null || true
done
sleep 1
nohup "$NODE" src/server.mjs >>"$HOME/Desktop/BOCSA-Pro.log" 2>&1 &
sleep 3
VER=$(curl -sf http://127.0.0.1:3850/api/status 2>/dev/null | grep -o '"version":"[^"]*"' | head -1 || echo "")
echo "BOCSA Pro: http://localhost:3850 ${VER}"
TS=$(date +%s)
/usr/bin/open -a Safari "http://localhost:3850/?v=${TS}" 2>/dev/null || true
