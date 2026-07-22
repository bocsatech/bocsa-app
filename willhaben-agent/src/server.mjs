import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, resolvePort } from './config.mjs';
import {
  loadStore,
  saveStore,
  getConversation,
  listTemplates,
  saveTemplate,
  deleteTemplate,
  deleteConversation,
  deleteMessage,
  applyTemplate,
} from './store.mjs';
import { parsePriceChart, lookupPrice, saveChartFile } from './price-chart.mjs';
import { syncInbox, sendReply, deleteConversationRemote, deleteMessageRemote } from './inbox-sync.mjs';
import { APP_VERSION } from './version.mjs';

const skipRemoteDelete = () => process.env.AGENT_SKIP_REMOTE_DELETE === '1'
  || process.env.AGENT_DATA_DIR?.includes('data-test');

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

let syncRunning = false;
let syncStatus = '';

export function setSyncStatus(msg) {
  syncStatus = msg;
}

function readBody(req, max = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > max) {
        reject(new Error('Túl nagy kérés'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj, null, 2));
}

function serve(res, filePath) {
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
  res.writeHead(200, {
    'Content-Type': `${types[ext] || 'text/plain'}; charset=utf-8`,
    'Cache-Control': ext === '.html' || ext === '.js' ? 'no-store' : 'public, max-age=60',
  });
  res.end(fs.readFileSync(filePath));
}

function parseMultipart(buffer, boundary) {
  const parts = [];
  const sep = Buffer.from(`--${boundary}`);
  let start = buffer.indexOf(sep) + sep.length;
  while (start > 0) {
    const end = buffer.indexOf(sep, start);
    if (end < 0) break;
    const chunk = buffer.slice(start, end);
    const he = chunk.indexOf('\r\n\r\n');
    if (he >= 0) {
      const headerText = chunk.slice(0, he).toString('utf8');
      const body = chunk.slice(he + 4, chunk.length - 2);
      parts.push({
        name: headerText.match(/name="([^"]+)"/)?.[1] || '',
        filename: headerText.match(/filename="([^"]*)"/)?.[1] || '',
        body,
      });
    }
    start = end + sep.length;
  }
  return parts;
}

export function startServer(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://127.0.0.1:${port}`);

        if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
          return serve(res, path.join(PUBLIC, 'index.html'));
        }
        if (req.method === 'GET' && (url.pathname === '/app.css' || url.pathname === '/app.js')) {
          const f = path.join(PUBLIC, path.basename(url.pathname));
          if (fs.existsSync(f)) return serve(res, f);
        }

        if (req.method === 'GET' && url.pathname === '/api/status') {
          const store = loadStore();
          return json(res, 200, {
            version: APP_VERSION,
            syncRunning,
            syncStatus,
            lastSyncAt: store.lastSyncAt,
            lastSyncError: store.lastSyncError,
            lastSyncDebug: store.lastSyncDebug,
            conversationCount: store.conversations.length,
            hasPriceChart: Boolean(store.priceChart?.rows?.length),
            templateCount: store.templates?.length ?? 0,
          });
        }

        if (req.method === 'GET' && url.pathname === '/api/conversations') {
          const store = loadStore();
          return json(res, 200, {
            conversations: store.conversations.map((c) => ({
              id: c.id,
              partnerName: c.partnerName,
              adTitle: c.adTitle,
              lastPreview: c.lastPreview,
              lastMessageAt: c.lastMessageAt,
              unread: c.unread,
              messageCount: c.messages?.length ?? 0,
            })),
          });
        }

        if (req.method === 'GET' && url.pathname.startsWith('/api/conversations/')) {
          const id = decodeURIComponent(url.pathname.split('/').pop());
          const conv = getConversation(loadStore(), id);
          if (!conv) return json(res, 404, { error: 'Nincs ilyen beszélgetés' });
          return json(res, 200, { conversation: conv });
        }

        if (req.method === 'DELETE' && url.pathname.match(/^\/api\/conversations\/[^/]+\/messages\/[^/]+$/)) {
          const parts = url.pathname.split('/');
          const convId = decodeURIComponent(parts[3]);
          const msgId = decodeURIComponent(parts[5]);
          try {
            if (skipRemoteDelete() || url.searchParams.get('local') === '1') {
              const store = loadStore();
              if (!deleteMessage(store, convId, msgId)) {
                return json(res, 404, { error: 'Nincs ilyen üzenet' });
              }
              saveStore(store);
              return json(res, 200, { ok: true, conversation: getConversation(store, convId) });
            }
            const result = await deleteMessageRemote(convId, msgId);
            return json(res, 200, {
              ok: true,
              warning: result.warning || null,
              conversation: getConversation(loadStore(), convId),
            });
          } catch (e) {
            return json(res, 400, { error: e.message });
          }
        }

        if (req.method === 'DELETE' && url.pathname.startsWith('/api/conversations/')) {
          const id = decodeURIComponent(url.pathname.split('/').pop());
          try {
            if (skipRemoteDelete() || url.searchParams.get('local') === '1') {
              const store = loadStore();
              if (!deleteConversation(store, id)) {
                return json(res, 404, { error: 'Nincs ilyen beszélgetés' });
              }
              saveStore(store);
              return json(res, 200, { ok: true });
            }
            const result = await deleteConversationRemote(id);
            return json(res, 200, { ok: true, remote: result.remote || null });
          } catch (e) {
            return json(res, 400, { error: e.message });
          }
        }

        if (req.method === 'POST' && url.pathname === '/api/sync') {
          if (syncRunning) return json(res, 409, { error: 'Szinkron már fut' });
          syncRunning = true;
          syncStatus = 'Indul…';
          syncInbox({ onProgress: setSyncStatus })
            .then((r) => {
              syncStatus = `Kész — ${r.count} db`;
            })
            .catch((e) => {
              syncStatus = `Hiba: ${e.message}`;
            })
            .finally(() => {
              syncRunning = false;
            });
          return json(res, 202, { ok: true });
        }

        if (req.method === 'POST' && url.pathname.match(/^\/api\/conversations\/[^/]+\/reply$/)) {
          const id = decodeURIComponent(req.url.split('/')[3]);
          const body = JSON.parse((await readBody(req)).toString('utf8'));
          await sendReply(id, body.text);
          return json(res, 200, { ok: true, conversation: getConversation(loadStore(), id) });
        }

        if (req.method === 'GET' && url.pathname === '/api/templates') {
          return json(res, 200, { templates: listTemplates(loadStore()) });
        }

        if (req.method === 'POST' && url.pathname === '/api/templates') {
          const body = JSON.parse((await readBody(req)).toString('utf8'));
          const store = loadStore();
          const t = saveTemplate(store, body);
          saveStore(store);
          return json(res, 200, { ok: true, template: t });
        }

        if (req.method === 'DELETE' && url.pathname.startsWith('/api/templates/')) {
          const id = decodeURIComponent(url.pathname.split('/').pop());
          const store = loadStore();
          deleteTemplate(store, id);
          saveStore(store);
          return json(res, 200, { ok: true });
        }

        if (req.method === 'POST' && url.pathname === '/api/templates/apply') {
          const body = JSON.parse((await readBody(req)).toString('utf8'));
          const store = loadStore();
          const tpl = store.templates.find((t) => t.id === body.templateId);
          if (!tpl) return json(res, 404, { error: 'Nincs sablon' });
          const text = applyTemplate(tpl.text, body.vars || {});
          return json(res, 200, { text });
        }

        if (req.method === 'GET' && url.pathname === '/api/price-chart') {
          const store = loadStore();
          return json(res, 200, { priceChart: store.priceChart });
        }

        if (req.method === 'POST' && url.pathname === '/api/price-chart') {
          const ctype = req.headers['content-type'] || '';
          let text = '';
          let filename = 'upload.csv';
          if (ctype.includes('multipart/form-data')) {
            const boundary = ctype.split('boundary=')[1];
            const parts = parseMultipart(await readBody(req), boundary);
            const file = parts.find((p) => p.name === 'file') || parts[0];
            filename = file.filename || 'upload.csv';
            text = file.body.toString('utf8');
            saveChartFile(filename, file.body);
          } else {
            const body = JSON.parse((await readBody(req)).toString('utf8'));
            text = body.text || '';
            filename = body.filename || 'upload.csv';
          }
          const chart = parsePriceChart(text, filename);
          const store = loadStore();
          store.priceChart = chart;
          saveStore(store);
          return json(res, 200, { ok: true, priceChart: chart });
        }

        if (req.method === 'POST' && url.pathname === '/api/price-chart/lookup') {
          const body = JSON.parse((await readBody(req)).toString('utf8'));
          const store = loadStore();
          const match = lookupPrice(store.priceChart, body);
          return json(res, 200, { match });
        }

        if (req.method === 'DELETE' && url.pathname === '/api/price-chart') {
          const store = loadStore();
          store.priceChart = null;
          saveStore(store);
          return json(res, 200, { ok: true });
        }

        return json(res, 404, { error: 'Ismeretlen útvonal' });
      } catch (err) {
        return json(res, 500, { error: err.message || String(err) });
      }
    });
    server.on('error', (err) => {
      if (err?.code === 'EADDRINUSE') {
        reject(new Error(`A ${port} port foglalt. Futtasd: npm run stop — majd npm start`));
        return;
      }
      reject(err);
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

export function createServer() {
  return startServer(resolvePort(loadConfig()));
}
