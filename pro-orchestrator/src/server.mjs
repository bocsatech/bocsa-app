import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, saveConfig, mergeSmsSettings } from './config.mjs';
import {
  getAllSlotStatus,
  startSlot,
  stopSlot,
  startLogin,
  getSlotLogs,
  enrichSlot,
  syncSlotToInstance,
  readInstanceConfig,
} from './slots.mjs';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const VERSION = '0.5.0';

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
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
  });
  res.end(fs.readFileSync(filePath));
}

function findSlot(config, slotId) {
  return config.slots.find((s) => s.id === slotId);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');

  if (req.method === 'GET' && url.pathname === '/') {
    return serveFile(res, path.join(PUBLIC, 'index.html'));
  }

  if (req.method === 'GET' && url.pathname === '/api/status') {
    const config = loadConfig();
    const statuses = getAllSlotStatus();
    const slots = config.slots.map(enrichSlot);
    return json(res, 200, {
      version: VERSION,
      port: config.adminPort ?? 3850,
      slots,
      runtime: statuses,
      features: {
        startStop: true,
        login: true,
        watchUrls: true,
        messageTemplate: true,
        smsSettings: true,
      },
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/slots') {
    const body = JSON.parse(await readBody(req));
    const config = loadConfig();
    if (!Array.isArray(body.slots)) {
      return json(res, 400, { error: 'slots tömb kell' });
    }
    const prevSlots = config.slots;
    config.slots = body.slots.map((s, i) => {
      const id = s.id || `slot-${i + 1}`;
      const previous = prevSlots.find((p) => p.id === id) || prevSlots[i] || {};
      const instance = readInstanceConfig(id);
      const program = s.program === 'hasznaltauto' ? 'hasznaltauto' : 'willhaben';
      const prefixes = Array.isArray(s.allowedPrefixes)
        ? s.allowedPrefixes.map((p) => String(p).trim()).filter(Boolean)
        : String(s.allowedPrefixes || '')
            .split(/[,;\s]+/)
            .map((p) => p.trim())
            .filter(Boolean);
      return {
        id,
        label: String(s.label || `Slot ${i + 1}`).trim(),
        program,
        username: String(s.username || '').trim(),
        watchUrls: (s.watchUrls || []).map((u, j) => ({
          id: u.id || `url-${j + 1}`,
          label: String(u.label || `URL ${j + 1}`).trim(),
          url: String(u.url || '').trim(),
          enabled: u.enabled !== false,
        })),
        messageTemplate: String(s.messageTemplate || '').trim(),
        allowedPrefixes: prefixes.length
          ? prefixes
          : previous.allowedPrefixes || instance?.allowedPrefixes || ['70', '20', '30'],
        sms: mergeSmsSettings(s, previous, instance),
      };
    });
    saveConfig(config);
    for (const slot of config.slots) {
      try {
        syncSlotToInstance(slot);
      } catch {
        /* instance sync optional before first start */
      }
    }
    return json(res, 200, { ok: true, slots: config.slots.map(enrichSlot) });
  }

  const startMatch = url.pathname.match(/^\/api\/slots\/([^/]+)\/start$/);
  if (req.method === 'POST' && startMatch) {
    const config = loadConfig();
    const slot = findSlot(config, startMatch[1]);
    if (!slot) return json(res, 404, { error: 'Ismeretlen slot' });
    try {
      const result = startSlot(slot);
      return json(res, result.ok ? 200 : 409, result);
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  const stopMatch = url.pathname.match(/^\/api\/slots\/([^/]+)\/stop$/);
  if (req.method === 'POST' && stopMatch) {
    const result = stopSlot(stopMatch[1]);
    return json(res, 200, result);
  }

  const loginMatch = url.pathname.match(/^\/api\/slots\/([^/]+)\/login$/);
  if (req.method === 'POST' && loginMatch) {
    const config = loadConfig();
    const slot = findSlot(config, loginMatch[1]);
    if (!slot) return json(res, 404, { error: 'Ismeretlen slot' });
    try {
      const result = startLogin(slot);
      return json(res, 200, result);
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  const logMatch = url.pathname.match(/^\/api\/slots\/([^/]+)\/logs$/);
  if (req.method === 'GET' && logMatch) {
    return json(res, 200, { logs: getSlotLogs(logMatch[1]) });
  }

  json(res, 404, { error: 'Not found' });
});

const config = loadConfig();
const port = config.adminPort ?? 3850;

server.listen(port, '127.0.0.1', () => {
  console.log(`\n  Pro Orchestrator: http://127.0.0.1:${port}  (v${VERSION})`);
  console.log('  6 slot — indítás / leállítás / napló\n');
});
