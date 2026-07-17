#!/bin/bash
# BOCSA Pro — kalibrációs hurok javítás EGY parancs (git pull nélkül is működik)
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

cd "$HOME/Downloads/bocsa-app" 2>/dev/null || cd "$HOME/Desktop/bocsa-app" 2>/dev/null || {
  echo "❌ Nincs bocsa-app mappa (Downloads vagy Desktop)"
  exit 1
}
echo "📁 $(pwd)"

NODE=""
for p in /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node 2>/dev/null)"; do
  [ -x "$p" ] && NODE="$p" && break
done
[ -n "$NODE" ] || { echo "❌ Node.js kell"; exit 1; }

echo "🛑 Slotok + orchestrator leállítása..."
cd pro-orchestrator
"$NODE" src/stop.mjs 2>/dev/null || true
for port in 3850 3851 3852 3853 3854 3855 3856; do
  lsof -ti :$port 2>/dev/null | xargs kill -9 2>/dev/null || true
done
sleep 2
cd ..

echo "📥 Kód frissítés (git reset VAGY GitHub letöltés)..."
if git rev-parse --git-dir >/dev/null 2>&1; then
  git fetch origin main 2>/dev/null && git reset --hard origin/main 2>/dev/null && echo "  ✓ git reset --hard origin/main"
fi

OLD=$("$NODE" -e "
const fs=require('fs');
const t=fs.readFileSync('willhaben-pro/src/index.mjs','utf8');
process.exit(t.includes('Kalibrálás → referencia')?1:0);
" 2>/dev/null; echo $?)

if [ "$OLD" != "0" ]; then
  echo "  ⚠ Régi kód — letöltés GitHub-ról..."
  RAW="https://raw.githubusercontent.com/bocsatech/bocsa-app/main"
  for f in \
    willhaben-pro/src/parse.mjs \
    willhaben-pro/src/index.mjs \
    willhaben-pro/src/state.mjs \
    willhaben-pro/src/config.mjs \
    willhaben-pro/src/instance-lock.mjs \
    willhaben-pro/src/stop.mjs \
    hasznaltauto-pro/src/parse.mjs \
    hasznaltauto-pro/src/index.mjs \
    hasznaltauto-pro/src/state.mjs \
    hasznaltauto-pro/src/config.mjs \
    hasznaltauto-pro/src/instance-lock.mjs \
    hasznaltauto-pro/src/stop.mjs \
    pro-orchestrator/src/ensure-calibration-fix.mjs \
    pro-orchestrator/src/server.mjs \
    pro-orchestrator/public/index.html \
    pro-orchestrator/src/slots.mjs
  do
    curl -sf "$RAW/$f" -o "$f" && echo "  ✓ $f" || echo "  ✗ $f"
  done
fi

echo "🧹 Kalibrálási state törlése..."
for slot in pro-orchestrator/data/instances/slot-*; do
  [ -f "$slot/state.json" ] || continue
  "$NODE" -e "
const fs=require('fs'); const f='$slot/state.json';
const s=JSON.parse(fs.readFileSync(f,'utf8'));
s.urlMarkers={}; s.urlCalibrated={}; s.urlSeenIds={};
fs.writeFileSync(f, JSON.stringify(s,null,2));
console.log('  ✓', f);
"
done

echo "🚀 Orchestrator indítás..."
cd pro-orchestrator
nohup "$NODE" src/server.mjs >>"$HOME/Desktop/BOCSA-Pro.log" 2>&1 &
sleep 3
VER=$(curl -sf http://127.0.0.1:3850/api/status 2>/dev/null | grep -o '"version":"[^"]*"' || echo "?")
echo "Verzió: $VER"
/usr/bin/open -a Safari "http://localhost:3850" 2>/dev/null || true
echo ""
echo "✅ Kész!"
echo "   1. Safari: Cmd+Shift+R"
echo "   2. Minden slot: ■ Leállítás → ↻ Újraindítás"
echo "   3. Naplóban: „Ellenőrizve — N hirdetés, nincs új” (NEM „referencia”)"
