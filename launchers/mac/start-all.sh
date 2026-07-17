#!/bin/bash
# BOCSA Pro Orchestrator — indítás + Safari (3850)
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

BOCSA=""
for d in "$HOME/Downloads/bocsa-app" "$HOME/Desktop/bocsa-app"; do
  [ -d "$d/pro-orchestrator" ] && BOCSA="$d" && break
done
[ -n "$BOCSA" ] || { echo "Nincs bocsa-app/pro-orchestrator"; exit 1; }

NODE=""
for p in /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node 2>/dev/null)"; do
  [ -x "$p" ] && NODE="$p" && break
done
[ -n "$NODE" ] || { echo "Node.js kell"; exit 1; }

cd "$BOCSA/pro-orchestrator"
"$NODE" src/stop.mjs 2>/dev/null || true
nohup "$NODE" src/server.mjs >>"$HOME/Desktop/BOCSA-Pro.log" 2>&1 &
sleep 2
/usr/bin/open -a Safari "http://localhost:3850" 2>/dev/null || true
echo "BOCSA Pro: http://localhost:3850"
