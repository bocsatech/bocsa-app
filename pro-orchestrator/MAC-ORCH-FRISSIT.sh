#!/usr/bin/env bash
# BOCSA Pro — régi leállítás + legújabb kód + újraindítás (egy parancs, git nélkül)
# curl -sf https://raw.githubusercontent.com/bocsatech/bocsa-app/main/pro-orchestrator/MAC-ORCH-FRISSIT.sh | bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

MIN_VERSION="0.9.0"
ORCH="${HOME}/Downloads/bocsa-orchestrator"
WH="${HOME}/Downloads/willhaben pro"
ORCH_BASE="https://raw.githubusercontent.com/bocsatech/bocsa-app/main/pro-orchestrator"
WH_BASE="${ORCH_BASE}/vendor/willhaben-pro"

if [ ! -f "${ORCH}/src/server.mjs" ]; then
  ORCH="${HOME}/Downloads/bocsa-app/pro-orchestrator"
fi
if [ ! -f "${ORCH}/src/server.mjs" ]; then
  echo "❌ Nincs orchestrator. Futtasd:"
  echo "   curl -sf https://raw.githubusercontent.com/bocsatech/bocsa-app/main/scripts/MAC-TELEPIT-MINDEN.sh | bash"
  exit 1
fi

NODE=""
for p in /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node 2>/dev/null)"; do
  [ -x "$p" ] && NODE="$p" && break
done
[ -n "$NODE" ] || { echo "❌ Node.js kell (https://nodejs.org)"; exit 1; }

echo "📁 Orchestrator: ${ORCH}"
echo "📁 Willhaben Pro: ${WH}"
echo ""

echo "🛑 Régi folyamatok leállítása (3850–3856)..."
cd "${ORCH}"
"$NODE" src/stop.mjs 2>/dev/null || true
for port in 3850 3851 3852 3853 3854 3855 3856; do
  lsof -ti :"$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
done
sleep 2

mkdir -p "${ORCH}/src" "${ORCH}/public" "${ORCH}/scripts"
mkdir -p "${WH}/src"

fetch_orch() {
  curl -sf "${ORCH_BASE}/$1" -o "${ORCH}/$1"
}

fetch_wh() {
  curl -sf "${WH_BASE}/$1" -o "${WH}/$1"
}

echo "📥 Legújabb kód letöltése..."
fetch_orch "src/server.mjs"
fetch_orch "src/slots.mjs"
fetch_orch "src/config.mjs"
fetch_orch "src/auto-start.mjs"
fetch_orch "src/program-paths.mjs"
fetch_orch "src/ensure-calibration-fix.mjs"
fetch_orch "src/stop.mjs"
fetch_orch "public/index.html"
fetch_orch "scripts/test-slot-urls.mjs"

for f in \
  src/index.mjs \
  src/message.mjs \
  src/exclude-keywords.mjs \
  src/ad-detail.mjs \
  src/admin-server.mjs \
  config.default.json; do
  fetch_wh "$f"
done

echo "🚀 Új orchestrator indítása..."
cd "${ORCH}"
nohup "$NODE" src/server.mjs >>"${HOME}/Desktop/BOCSA-Pro.log" 2>&1 &
sleep 3

VER=""
for _ in 1 2 3 4 5; do
  VER=$(curl -sf "http://127.0.0.1:3850/api/status" 2>/dev/null | "$NODE" -e "
    let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
      try { console.log(JSON.parse(d).version||''); } catch { console.log(''); }
    });
  " 2>/dev/null || true)
  [ -n "$VER" ] && break
  sleep 1
done

echo ""
if [ -z "$VER" ]; then
  echo "❌ Az orchestrator nem válaszol a 3850-es porton."
  echo "   Nézd: ${HOME}/Desktop/BOCSA-Pro.log"
  exit 1
fi

echo "✓ Futó verzió: v${VER} (cél: v${MIN_VERSION}+)"

if [ "$("$NODE" -e "const a='${VER}'.split('.').map(Number); const b='${MIN_VERSION}'.split('.').map(Number); let ok=true; for(let i=0;i<3;i++){ if((a[i]||0)<(b[i]||0)) ok=false; } process.exit(ok?0:1);")" != "0" ]; then
  echo "⚠ Még régi verzió fut — próbáld újra, vagy:"
  echo "   curl -sf ${ORCH_BASE}/../scripts/MAC-TELEPIT-MINDEN.sh | bash"
  exit 1
fi

TS=$(date +%s)
/usr/bin/open -a Safari "http://localhost:3850/?v=${TS}" 2>/dev/null || true

echo ""
echo "✅ Kész! Safari megnyílt — KÖTELEZŐ: Cmd+Shift+R (kemény frissítés)"
echo "   Új: Mobile.de Pro slot (program: Mobile.de Pro, SMS +49)"
echo "   Willhaben slot: 💾 Mentés → ■ Leállítás → ↻ Újraindítás"
