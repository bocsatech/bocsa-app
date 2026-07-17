#!/bin/bash
# BOCSA Pro — beragadt állapot + Törlés gomb (egy parancs)
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

cd "$HOME/Downloads/bocsa-app" 2>/dev/null || cd "$HOME/Desktop/bocsa-app" 2>/dev/null || { echo "❌ Nincs bocsa-app"; exit 1; }
echo "📁 $(pwd)"

NODE=""
for p in /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node 2>/dev/null)"; do
  [ -x "$p" ] && NODE="$p" && break
done
[ -n "$NODE" ] || { echo "❌ Node kell"; exit 1; }

echo "🛑 Leállítás (beragadt slotok + orchestrator)..."
cd pro-orchestrator
"$NODE" src/stop.mjs 2>/dev/null || true
[ -f src/stop-all.mjs ] && "$NODE" src/stop-all.mjs 2>/dev/null || true
for port in 3850 3851 3852 3853 3854 3855 3856; do
  lsof -ti :$port 2>/dev/null | xargs kill -9 2>/dev/null || true
done
sleep 2
cd ..

echo "🔧 Törlés gomb telepítése..."
"$NODE" <<'NODE'
import fs from 'fs';
import path from 'path';
const root = process.cwd();
const html = path.join(root, 'pro-orchestrator/public/index.html');
const srv = path.join(root, 'pro-orchestrator/src/server.mjs');
const slots = path.join(root, 'pro-orchestrator/src/slots.mjs');

let h = fs.readFileSync(html, 'utf8');
if (!h.includes('log-clear')) {
  if (!h.includes('.log-head')) {
    h = h.replace(
      '.log-meta { font-size: 10px; color: var(--muted); margin-top: 4px; }',
      `.log-meta { font-size: 10px; color: var(--muted); margin-top: 4px; }
    .log-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
    .log-head label { margin-bottom: 0; }
    .log-clear { font: inherit; font-size: 11px; padding: 4px 10px; border-radius: 6px; border: 1px solid #ff6b6b55; background: #ff6b6b18; color: #ffb4b4; cursor: pointer; }
    .log-clear:hover { background: #ff6b6b33; }`
    );
  }
  if (h.includes('<label>Napló ${running')) {
    h = h.replace(
      '<label>Napló ${running ? \'(aktuális futás)\' : \'\'}</label>',
      `<div class="log-head">
                <label>Napló \${running ? '(aktuális futás)' : ''}</label>
                <button type="button" class="log-clear" onclick="clearLogs('\${slot.id}')">🗑 Törlés</button>
              </div>`
    );
  }
  if (!h.includes('async function clearLogs')) {
    h = h.replace(
      'async function refreshLogs(slotId) {',
      `async function clearLogs(slotId) {
      if (!confirm('Töröljük az összes naplóbejegyzést?')) return;
      const res = await fetch(\`/api/slots/\${slotId}/logs\`, { method: 'DELETE' });
      const body = await res.json();
      if (res.ok && body.ok !== false) await refreshLogs(slotId);
      else alert(body.error || 'Törlés sikertelen');
    }
    async function refreshLogs(slotId) {`
    );
  }
  fs.writeFileSync(html, h);
  console.log('✓ Törlés gomb → index.html');
} else console.log('✓ index.html OK');

if (!fs.readFileSync(slots, 'utf8').includes('export function clearSlotLogs')) {
  fs.appendFileSync(slots, `
export function clearSlotLogs(slotId) {
  const dir = instanceDir(slotId);
  if (!fs.existsSync(dir)) return { ok: true, cleared: 0 };
  let cleared = 0;
  const sf = path.join(dir, 'state.json');
  if (fs.existsSync(sf)) {
    const st = JSON.parse(fs.readFileSync(sf, 'utf8'));
    cleared = (st.log || []).length;
    st.log = [];
    fs.writeFileSync(sf, JSON.stringify(st, null, 2));
  }
  const pf = path.join(dir, 'process.log');
  if (fs.existsSync(pf)) fs.writeFileSync(pf, '');
  return { ok: true, cleared };
}
`);
  console.log('✓ clearSlotLogs → slots.mjs');
}

let s = fs.readFileSync(srv, 'utf8');
if (!s.includes('clearSlotLogs')) s = s.replace('getSlotLogs,', 'getSlotLogs,\n  clearSlotLogs,');
if (!s.includes("method === 'DELETE'")) {
  s = s.replace(
    `if (req.method === 'GET' && logMatch) {
    return json(res, 200, getSlotLogs(logMatch[1]));
  }`,
    `if (req.method === 'GET' && logMatch) {
    return json(res, 200, getSlotLogs(logMatch[1]));
  }
  if (req.method === 'DELETE' && logMatch) {
    return json(res, 200, clearSlotLogs(logMatch[1]));
  }`
  );
}
s = s.replace(/const VERSION = '[^']+';/, "const VERSION = '0.7.1';");
fs.writeFileSync(srv, s);
console.log('✓ server.mjs OK');
NODE

echo "🚀 Orchestrator indítás..."
cd pro-orchestrator
nohup "$NODE" src/server.mjs >>"$HOME/Desktop/BOCSA-Pro.log" 2>&1 &
sleep 2
VER=$(curl -sf http://127.0.0.1:3850/api/status | grep -o '"version":"[^"]*"' || echo "?")
BTN=$(grep -c 'Törlés' public/index.html || echo 0)
echo "Verzió: $VER | Törlés gomb a fájlban: $BTN"
/usr/bin/open -a Safari "http://localhost:3850" 2>/dev/null || true
echo "✅ Kész — Safari Cmd+Shift+R ha nem látod a gombot"
