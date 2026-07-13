import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, saveConfig } from './config.mjs';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const VERSION = '0.1.0';

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj, null, 2));
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
  res.writeHead(200, {
    'Content-Type': `${types[ext] || 'text/plain'}; charset=utf-8`,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
  });
  res.end(fs.readFileSync(filePath));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');

  if (req.method === 'GET' && url.pathname === '/') {
    return serveFile(res, path.join(PUBLIC, 'index.html'));
  }

  if (req.method === 'GET' && url.pathname === '/api/status') {
    const config = loadConfig();
    return json(res, 200, {
      version: VERSION,
      port: config.adminPort ?? 3850,
      slots: config.slots,
      features: { startStop: false },
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/slots') {
    const body = JSON.parse(await readBody(req));
    const config = loadConfig();
    if (!Array.isArray(body.slots)) {
      return json(res, 400, { error: 'slots tömb kell' });
    }
    config.slots = body.slots.map((s, i) => ({
      id: s.id || `slot-${i + 1}`,
      label: String(s.label || `Slot ${i + 1}`).trim(),
      program: s.program === 'hasznaltauto' ? 'hasznaltauto' : 'willhaben',
      username: String(s.username || '').trim(),
    }));
    saveConfig(config);
    return json(res, 200, { ok: true, slots: config.slots });
  }

  json(res, 404, { error: 'Not found' });
});

const config = loadConfig();
const port = config.adminPort ?? 3850;

server.listen(port, '127.0.0.1', () => {
  console.log(`\n  Pro Orchestrator: http://127.0.0.1:${port}  (v${VERSION})`);
  console.log('  6 slot — szerkesztés kész, indítás még nincs (következő lépés)\n');
});
