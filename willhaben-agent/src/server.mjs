import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, resolvePort } from './config.mjs';
import { loadStore, saveStore, getConversation, savePriceChart } from './store.mjs';
import { parsePriceChartText, saveUploadedFile, lookupPrice } from './price-chart.mjs';
import { syncInbox, sendReply } from './inbox-sync.mjs';
import { APP_VERSION } from './version.mjs';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

let syncRunning = false;
let syncStatus = '';

export function setSyncStatus(msg) {
  syncStatus = msg;
}

function readBody(req, maxBytes = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > maxBytes) {
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

function serveFile(res, filePath) {
  const ext = path.extname(filePath);
  const types = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.svg': 'image/svg+xml',
  };
  const headers = {
    'Content-Type': `${types[ext] || 'text/plain'}; charset=utf-8`,
    'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=60',
  };
  res.writeHead(200, headers);
  res.end(fs.readFileSync(filePath));
}

function parseMultipart(buffer, boundary) {
  const parts = [];
  const sep = Buffer.from(`--${boundary}`);
  let start = buffer.indexOf(sep) + sep.length;

  while (start > 0) {
    let end = buffer.indexOf(sep, start);
    if (end < 0) break;
    const chunk = buffer.slice(start, end);
    const headerEnd = chunk.indexOf('\r\n\r\n');
    if (headerEnd >= 0) {
      const headerText = chunk.slice(0, headerEnd).toString('utf8');
      const body = chunk.slice(headerEnd + 4);
      const nameMatch = headerText.match(/name="([^"]+)"/);
      const fileMatch = headerText.match(/filename="([^"]*)"/);
      parts.push({
        name: nameMatch?.[1] || '',
        filename: fileMatch?.[1] || '',
        body: body.slice(0, body.length - 2),
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
          return serveFile(res, path.join(PUBLIC, 'index.html'));
        }
        if (req.method === 'GET' && (url.pathname === '/app.css' || url.pathname === '/app.js')) {
          const file = path.join(PUBLIC, path.basename(url.pathname));
          if (fs.existsSync(file)) return serveFile(res, file);
        }

        if (req.method === 'GET' && url.pathname === '/api/status') {
          const store = loadStore();
          return json(res, 200, {
            version: APP_VERSION,
            syncRunning,
            syncStatus,
            lastSyncAt: store.lastSyncAt,
            lastSyncError: store.lastSyncError,
            conversationCount: store.conversations.length,
            priceChart: store.priceChart
              ? {
                  filename: store.priceChart.filename,
                  uploadedAt: store.priceChart.uploadedAt,
                  rowCount: store.priceChart.rowCount,
                }
              : null,
          });
        }

        if (req.method === 'GET' && url.pathname === '/api/conversations') {
          const store = loadStore();
          const list = store.conversations.map((c) => ({
            id: c.id,
            partnerName: c.partnerName,
            adTitle: c.adTitle,
            lastPreview: c.lastPreview,
            lastMessageAt: c.lastMessageAt,
            unread: c.unread,
            messageCount: c.messages?.length ?? 0,
          }));
          return json(res, 200, { conversations: list });
        }

        if (req.method === 'GET' && url.pathname.startsWith('/api/conversations/')) {
          const id = decodeURIComponent(url.pathname.split('/').pop());
          const store = loadStore();
          const conv = getConversation(store, id);
          if (!conv) return json(res, 404, { error: 'Nincs ilyen beszélgetés' });
          return json(res, 200, { conversation: conv });
        }

        if (req.method === 'POST' && url.pathname === '/api/sync') {
          if (syncRunning) {
            return json(res, 409, { error: 'Szinkronizálás már fut', syncStatus });
          }
          syncRunning = true;
          syncStatus = 'Indul…';
          syncInbox({ onProgress: setSyncStatus })
            .then((result) => {
              syncStatus = `Kész — ${result.count} beszélgetés`;
            })
            .catch((err) => {
              syncStatus = `Hiba: ${err.message}`;
            })
            .finally(() => {
              syncRunning = false;
            });
          return json(res, 202, { ok: true, message: 'Szinkronizálás elindult' });
        }

        if (req.method === 'POST' && url.pathname.startsWith('/api/conversations/') && url.pathname.endsWith('/reply')) {
          const id = decodeURIComponent(url.pathname.split('/')[3]);
          const body = JSON.parse((await readBody(req)).toString('utf8'));
          await sendReply(id, body.text);
          const conv = getConversation(loadStore(), id);
          return json(res, 200, { ok: true, conversation: conv });
        }

        if (req.method === 'GET' && url.pathname === '/api/price-chart') {
          const store = loadStore();
          return json(res, 200, { priceChart: store.priceChart });
        }

        if (req.method === 'POST' && url.pathname === '/api/price-chart') {
          const ctype = req.headers['content-type'] || '';
          let text = '';
          let filename = 'upload.csv';

          if (ctype.includes('application/json')) {
            const body = JSON.parse((await readBody(req)).toString('utf8'));
            text = body.text || '';
            filename = body.filename || 'upload.json';
          } else if (ctype.includes('multipart/form-data')) {
            const boundary = ctype.split('boundary=')[1];
            const raw = await readBody(req);
            const parts = parseMultipart(raw, boundary);
            const filePart = parts.find((p) => p.name === 'file') || parts[0];
            if (!filePart) return json(res, 400, { error: 'Nincs fájl' });
            filename = filePart.filename || 'upload.csv';
            text = filePart.body.toString('utf8');
            saveUploadedFile(filename, filePart.body);
          } else {
            const raw = await readBody(req);
            text = raw.toString('utf8');
            filename = req.headers['x-filename'] || 'upload.csv';
          }

          const chart = parsePriceChartText(text, filename);
          const store = loadStore();
          savePriceChart(store, chart);
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

    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

export function createServerFromConfig() {
  const config = loadConfig();
  const port = resolvePort(config);
  return startServer(port);
}
