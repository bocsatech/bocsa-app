import { loadConfig, resolvePort, getProfileDir } from './config.mjs';
import { acquireLock, releaseLock } from './instance-lock.mjs';
import { createServer, setSyncStatus } from './server.mjs';
import { APP_VERSION } from './version.mjs';

acquireLock();
const port = resolvePort(loadConfig());

console.log(`\n  Willhaben Agent v${APP_VERSION}`);
console.log(`  Web: http://127.0.0.1:${port}`);
console.log(`  Adatok: ${getProfileDir().replace(/browser-profile$/, '')}`);
console.log('  Első lépés: npm run login\n');

const server = await createServer();

process.on('SIGINT', () => {
  server.close();
  releaseLock();
  process.exit(0);
});
process.on('SIGTERM', () => process.emit('SIGINT'));
