import { loadConfig, resolvePort, getProfileDir } from './config.mjs';
import { acquireLock, releaseLock } from './instance-lock.mjs';
import { createServerFromConfig, setSyncStatus } from './server.mjs';
import { APP_VERSION } from './version.mjs';

acquireLock();

const config = loadConfig();
const port = resolvePort(config);

console.log(`\n  Willhaben Agent v${APP_VERSION}`);
console.log(`  Web: http://127.0.0.1:${port}`);
console.log(`  Profil: ${getProfileDir()}`);
console.log('  Első lépés: npm run login\n');

const server = await createServerFromConfig();

let syncTimer = null;

function scheduleSync() {
  const mins = Number(config.syncIntervalMinutes) || 0;
  if (mins <= 0) return;
  syncTimer = setInterval(async () => {
    try {
      const { syncInbox: runSync } = await import('./inbox-sync.mjs');
      await runSync({ onProgress: setSyncStatus });
    } catch (err) {
      setSyncStatus(`Auto-sync hiba: ${err.message}`);
    }
  }, mins * 60 * 1000);
}

scheduleSync();

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown() {
  if (syncTimer) clearInterval(syncTimer);
  server.close();
  releaseLock();
  process.exit(0);
}
