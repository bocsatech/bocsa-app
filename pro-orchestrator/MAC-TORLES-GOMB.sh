#!/bin/bash
# Napló Törlés gomb — git nélkül, Mac Terminal
set -u
cd "$HOME/Downloads/bocsa-app" 2>/dev/null || cd "$HOME/Desktop/bocsa-app" 2>/dev/null || { echo "Nincs bocsa-app"; exit 1; }
[ -d pro-orchestrator ] || { echo "Nincs pro-orchestrator mappa"; exit 1; }

NODE=""
for p in /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node 2>/dev/null)"; do
  [ -x "$p" ] && NODE="$p" && break
done
[ -n "$NODE" ] || { echo "Node kell"; exit 1; }

"$NODE" <<'NODE'
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const html = path.join(root, 'pro-orchestrator/public/index.html');
const srv = path.join(root, 'pro-orchestrator/src/server.mjs');
const slots = path.join(root, 'pro-orchestrator/src/slots.mjs');

if (!fs.existsSync(html)) { console.error('Nincs index.html'); process.exit(1); }

let h = fs.readFileSync(html, 'utf8');
if (!h.includes('log-clear')) {
  h = h.replace(
    '.log-meta { font-size: 10px; color: var(--muted); margin-top: 4px; }',
    `.log-meta { font-size: 10px; color: var(--muted); margin-top: 4px; }
    .log-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
    .log-head label { margin-bottom: 0; }
    .log-clear { font: inherit; font-size: 11px; padding: 4px 10px; border-radius: 6px; border: 1px solid #ff6b6b55; background: #ff6b6b18; color: #ffb4b4; cursor: pointer; }
    .log-clear:hover { background: #ff6b6b33; }`
  );
  h = h.replace(
    '<label>Napló ${running ? \'(aktuális futás)\' : \'\'}</label>',
    `<div class="log-head">
                <label>Napló \${running ? '(aktuális futás)' : ''}</label>
                <button type="button" class="log-clear" onclick="clearLogs('\${slot.id}')" title="Összes naplóbejegyzés törlése">🗑 Törlés</button>
              </div>`
  );
  if (!h.includes('async function clearLogs')) {
    h = h.replace(
      'async function refreshLogs(slotId) {',
      `async function clearLogs(slotId) {
      if (!confirm('Töröljük az összes naplóbejegyzést ennél a slotnál?')) return;
      try {
        const res = await fetch(\`/api/slots/\${slotId}/logs\`, { method: 'DELETE' });
        const body = await res.json();
        if (!res.ok || body.ok === false) { alert(body.error || 'Napló törlés sikertelen'); return; }
        await refreshLogs(slotId);
      } catch { alert('Napló törlés sikertelen'); }
    }

    async function refreshLogs(slotId) {`
    );
  }
  fs.writeFileSync(html, h);
  console.log('✓ index.html — Törlés gomb');
} else {
  console.log('✓ index.html már friss');
}

if (fs.existsSync(slots) && !fs.readFileSync(slots, 'utf8').includes('clearSlotLogs')) {
  let s = fs.readFileSync(slots, 'utf8');
  s += `

export function clearSlotLogs(slotId) {
  const dir = instanceDir(slotId);
  if (!fs.existsSync(dir)) return { ok: true, cleared: 0 };
  let cleared = 0;
  const stateFile = path.join(dir, 'state.json');
  if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    cleared = Array.isArray(state.log) ? state.log.length : 0;
    state.log = [];
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  }
  const procFile = path.join(dir, 'process.log');
  if (fs.existsSync(procFile)) fs.writeFileSync(procFile, '');
  return { ok: true, cleared };
}
`;
  fs.writeFileSync(slots, s);
  console.log('✓ slots.mjs — clearSlotLogs');
}

if (fs.existsSync(srv)) {
  let s = fs.readFileSync(srv, 'utf8');
  if (!s.includes('clearSlotLogs')) {
    s = s.replace('getSlotLogs,', 'getSlotLogs,\n  clearSlotLogs,');
  }
  if (!s.includes('method === \'DELETE\' && logMatch')) {
    s = s.replace(
      `  if (req.method === 'GET' && logMatch) {
    return json(res, 200, getSlotLogs(logMatch[1]));
  }`,
      `  if (req.method === 'GET' && logMatch) {
    return json(res, 200, getSlotLogs(logMatch[1]));
  }

  if (req.method === 'DELETE' && logMatch) {
    try {
      const result = clearSlotLogs(logMatch[1]);
      return json(res, result.ok ? 200 : 500, result);
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }`
    );
  }
  s = s.replace(/const VERSION = '[^']+';/, "const VERSION = '0.7.1';");
  fs.writeFileSync(srv, s);
  console.log('✓ server.mjs — DELETE API');
}
NODE

echo ""
echo "Indítsd újra az orchestrator-t:"
echo "  cd pro-orchestrator && node src/stop.mjs; lsof -ti :3850 | xargs kill 2>/dev/null; node src/server.mjs"
echo "Safari: Cmd+Shift+R a localhost:3850 oldalon"
