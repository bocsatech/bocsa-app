#!/bin/bash
# Kalibrálási hurok javítás — két autó referencia váltakozás
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd "$HOME/Downloads/bocsa-app" 2>/dev/null || cd "$HOME/Desktop/bocsa-app" 2>/dev/null || exit 1

NODE=""
for p in /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node 2>/dev/null)"; do
  [ -x "$p" ] && NODE="$p" && break
done

echo "🛑 Slotok leállítása..."
cd pro-orchestrator
"$NODE" src/stop.mjs 2>/dev/null || true
for port in 3850 3851 3852 3853 3854 3855 3856; do
  lsof -ti :$port 2>/dev/null | xargs kill -9 2>/dev/null || true
done
sleep 2

echo "🧹 Régi kalibrálási state törlése..."
for slot in data/instances/slot-*; do
  [ -f "$slot/state.json" ] || continue
  "$NODE" -e "
const fs=require('fs'); const f='$slot/state.json';
const s=JSON.parse(fs.readFileSync(f,'utf8'));
s.urlMarkers={}; s.urlCalibrated={}; s.urlSeenIds={};
fs.writeFileSync(f, JSON.stringify(s,null,2));
console.log('  ✓', f);
"
done
cd ..

echo "📥 Git frissítés..."
git pull origin main

echo "🚀 Indítás..."
bash pro-orchestrator/MAC-TORLES-GOMB.sh 2>/dev/null || {
  cd pro-orchestrator && nohup "$NODE" src/server.mjs >>"$HOME/Desktop/BOCSA-Pro.log" 2>&1 &
}
echo "✅ Kész — slot: Leállítás → Újraindítás, majd Cmd+Shift+R"
