import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, saveConfig } from './config.mjs';
import { loadState, saveState, appendLog } from './state.mjs';
import {
  isAuthEnabled,
  verifyPassword,
  createSession,
  revokeToken,
  getTokenFromRequest,
  requireAuth,
  publicConfig,
  isValidToken,
} from './auth.mjs';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

let monitorControl = null;
let appShutdown = null;

export function setMonitorControl(ctrl) {
  monitorControl = ctrl;
}

export function setAppShutdown(fn) {
  appShutdown = fn;
}

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
  res.writeHead(200, { 'Content-Type': `${types[ext] || 'text/plain'}; charset=utf-8` });
  res.end(fs.readFileSync(filePath));
}

export function startAdminServer(port = 3847) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);

      if (req.method === 'GET' && url.pathname === '/') {
        return serveFile(res, path.join(PUBLIC, 'admin.html'));
      }

      if (req.method === 'GET' && url.pathname === '/api/status') {
        const config = loadConfig();
        const state = loadState();
        const token = getTokenFromRequest(req);
        return json(res, 200, {
          config: publicConfig(config),
          state,
          running: monitorControl?.isRunning?.() ?? false,
          authRequired: isAuthEnabled(),
          unlocked: !isAuthEnabled() || isValidToken(token),
        });
      }

      if (req.method === 'POST' && url.pathname === '/api/auth') {
        const body = JSON.parse(await readBody(req));
        if (!isAuthEnabled()) {
          return json(res, 200, { ok: true, unlocked: true, authRequired: false });
        }
        if (!verifyPassword(body.password)) {
          return json(res, 401, { error: 'Hibás jelszó', authRequired: true });
        }
        const session = createSession();
        return json(res, 200, { ok: true, ...session, authRequired: true });
      }

      if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
        revokeToken(getTokenFromRequest(req));
        return json(res, 200, { ok: true });
      }

      if (req.method === 'POST' && url.pathname === '/api/config/password') {
        const body = JSON.parse(await readBody(req));
        const newPassword = String(body.password || '').trim();
        if (newPassword.length < 4) {
          return json(res, 400, { error: 'A jelszó legalább 4 karakter legyen' });
        }
        const config = loadConfig();
        if (isAuthEnabled()) {
          if (!requireAuth(req, res)) return;
        }
        config.adminPanel = { ...(config.adminPanel || {}), password: newPassword };
        saveConfig(config);
        const state = loadState();
        appendLog(state, 'info', 'Admin: limitek jelszava beállítva');
        saveState(state);
        return json(res, 200, { ok: true });
      }

      if (req.method === 'POST' && url.pathname === '/api/config') {
        const body = JSON.parse(await readBody(req));
        if (body.admin != null && isAuthEnabled()) {
          return json(res, 403, {
            error: 'Limitek csak jelszóval módosíthatók — használd a Limitek mentése gombot',
            authRequired: true,
          });
        }
        const config = loadConfig();
        if (body.messageTemplate != null) config.messageTemplate = body.messageTemplate;
        if (body.pollIntervalSeconds != null) config.pollIntervalSeconds = Number(body.pollIntervalSeconds);
        if (body.sendDelayMs != null) config.sendDelayMs = Number(body.sendDelayMs);
        if (Array.isArray(body.watchUrls)) {
          config.watchUrls = body.watchUrls.map((u, i) => ({
            id: u.id || `url-${i + 1}`,
            label: u.label || `URL ${i + 1}`,
            url: u.url,
            enabled: u.enabled !== false,
          }));
        }
        saveConfig(config);
        const state = loadState();
        appendLog(state, 'info', 'Admin: konfiguráció mentve');
        saveState(state);
        return json(res, 200, { ok: true });
      }

      if (req.method === 'POST' && url.pathname === '/api/config/limits') {
        if (!requireAuth(req, res)) return;
        const body = JSON.parse(await readBody(req));
        const config = loadConfig();
        if (body.admin) {
          config.admin = { ...config.admin, ...body.admin };
        }
        saveConfig(config);
        const state = loadState();
        appendLog(state, 'info', 'Admin: limitek mentve');
        saveState(state);
        return json(res, 200, { ok: true });
      }

      if (req.method === 'POST' && url.pathname === '/api/control') {
        const body = JSON.parse(await readBody(req));
        if (body.action === 'start') monitorControl?.start?.();
        if (body.action === 'stop') monitorControl?.stop?.();
        if (body.action === 'recalibrate') monitorControl?.recalibrate?.();
        if (body.action === 'reset-stats') monitorControl?.resetStats?.();
        if (body.action === 'shutdown') {
          json(res, 200, { ok: true });
          setTimeout(() => appShutdown?.(), 200);
          return;
        }
        return json(res, 200, { ok: true });
      }

      json(res, 404, { error: 'Not found' });
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(
          new Error(
            `A ${port} port már foglalt — valószínűleg már fut egy Willhaben Pro példány.\n` +
              `  → Nyisd meg: http://127.0.0.1:${port}\n` +
              `  → Leállítás: npm run stop — majd npm start (npm start egyébként automatikusan leállítja a régit)`
          )
        );
        return;
      }
      reject(err);
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`\n  Admin panel: http://127.0.0.1:${port}\n`);
      resolve(server);
    });
  });
}
