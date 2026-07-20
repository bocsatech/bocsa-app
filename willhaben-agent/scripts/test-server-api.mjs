import http from 'http';
import { startServer } from '../src/server.mjs';

const port = 3870;
process.env.AGENT_PORT = String(port);
const server = await startServer(port);

function request(method, path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ method, hostname: '127.0.0.1', port, path }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'),
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

const status = await request('GET', '/api/status');
if (status.status !== 200 || !status.body.version) throw new Error('status fail');

const syncStart = await request('POST', '/api/sync');
if (syncStart.status !== 202 || !syncStart.body.ok) throw new Error('sync start fail');

await new Promise((r) => setTimeout(r, 3000));

const after = await request('GET', '/api/status');
if (typeof after.body.syncRunning !== 'boolean') throw new Error('sync status fail');

await new Promise((resolve) => server.close(resolve));
console.log('✓ szerver API teszt OK');
