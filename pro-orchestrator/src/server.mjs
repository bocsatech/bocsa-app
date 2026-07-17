import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, saveConfig, mergeSmsSettings, normalizePollInterval, normalizeSendDelay } from './config.mjs';
import {
  getAllSlotStatus,
  startSlot,
  restartSlot,
  stopSlot,
  startLogin,
  getSlotLogs,
  clearSlotLogs,
  enrichSlot,
  syncSlotToInstance,
  readInstanceConfig,
} from './slots.mjs';
import { startAutoSlots } from './auto-start.mjs';
import { ensureCalibrationFix } from './ensure-calibration-fix.mjs';
import { listProgramPaths, isWillhabenInstalled, isHasznaltautoInstalled } from './program-paths.mjs';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const VERSION = '0.8.1';

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
      autoStartOnLaunch: config.autoStartOnLaunch !== false,
      slots,
      runtime: statuses,
      features: {
        startStop: true,
        login: true,
        watchUrls: true,
        messageTemplate: true,
        smsSettings: true,
        timing: true,
        autoStart: true,
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
        pollIntervalSeconds: normalizePollInterval(
          s.pollIntervalSeconds ?? previous.pollIntervalSeconds ?? instance?.pollIntervalSeconds,
          program
        ),
        sendDelayMs: normalizeSendDelay(
          s.sendDelayMs ?? previous.sendDelayMs ?? instance?.sendDelayMs,
          program
        ),
        allowedPrefixes: prefixes.length
          ? prefixes
          : previous.allowedPrefixes || instance?.allowedPrefixes || ['70', '20', '30'],
        sms: mergeSmsSettings(s, previous, instance),
        autoStart: s.autoStart !== false,
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
      const result = await startSlot(slot);
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

  const startAllMatch = url.pathname === '/api/start-all';
  if (req.method === 'POST' && startAllMatch) {
    try {
      const result = await startAutoSlots();
      return json(res, 200, result);
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  const restartMatch = url.pathname.match(/^\/api\/slots\/([^/]+)\/restart$/);
  if (req.method === 'POST' && restartMatch) {
    const config = loadConfig();
    const slot = findSlot(config, restartMatch[1]);
    if (!slot) return json(res, 404, { error: 'Ismeretlen slot' });
    try {
      const result = await restartSlot(slot);
      return json(res, result.ok ? 200 : 409, result);
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  const logMatch = url.pathname.match(/^\/api\/slots\/([^/]+)\/logs$/);
  if (req.method === 'GET' && logMatch) {
    return json(res, 200, getSlotLogs(logMatch[1]));
  }

  if (req.method === 'DELETE' && logMatch) {
    try {
      const result = clearSlotLogs(logMatch[1]);
      return json(res, result.ok ? 200 : 500, result);
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  json(res, 404, { error: 'Not found' });
});

const config = loadConfig();
const port = config.adminPort ?? 3850;

server.listen(port, '127.0.0.1', () => {
  console.log(`\n  Pro Orchestrator: http://127.0.0.1:${port}  (v${VERSION})`);
  console.log('  6 slot — automatikus indítás URL-lel rendelkező slotoknál\n');
  const cfg = loadConfig();
  const runAutoStart = () => {
    if (cfg.autoStartOnLaunch === false) return;
    startAutoSlots()
      .then((r) => {
        const ok = r.started?.filter((s) => s.ok).length ?? 0;
        const skip = r.skipped?.length ?? 0;
        console.log(`  Auto-start: ${ok} slot elindítva, ${skip} kihagyva`);
      })
      .catch((err) => console.error('  Auto-start hiba:', err.message));
  };
  ensureCalibrationFix()
    .then((fix) => {
      if (fix.updated) {
        console.log(`  ⚠ Slotok újraindítása ajánlott (■ Leállítás → ↻ Újraindítás)`);
      }
      if (!fix.ok && fix.error) {
        console.log(`  ⚠ Kalibráció-javítás sikertelen: ${fix.error}`);
      }
    })
    .catch(() => {})
    .finally(() => {
      const paths = listProgramPaths();
      console.log('  Programok (Letöltések):');
      console.log(`    CRM:           ${paths.crm}`);
      console.log(`    Orchestrator:  ${paths.orchestrator}`);
      console.log(`    Willhaben Pro: ${paths.willhaben}${isWillhabenInstalled() ? '' : ' ⚠ hiányzik'}`);
      console.log(`    Hasznaltauto:  ${paths.hasznaltauto}${isHasznaltautoInstalled() ? '' : ' ⚠ hiányzik'}`);
      setTimeout(runAutoStart, 1500);
    });
});
