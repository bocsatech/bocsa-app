import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getRoot, loadConfig } from './config.mjs';

const LOCK_PATH = path.join(getRoot(), 'data', '.instance.lock');

function killOnPort(port) {
  try {
    const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    for (const pid of pids) {
      try {
        process.kill(Number(pid), 'SIGTERM');
        console.log(`  Leállítva (PID ${pid}, port ${port})`);
      } catch {
        /* already gone */
      }
    }
    return pids.length > 0;
  } catch {
    return false;
  }
}

function killByName() {
  try {
    execSync("pkill -f 'node src/index.mjs'", { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const config = loadConfig();
const port = config.adminPort ?? 3847;

const byPort = killOnPort(port);
const byName = killByName();

if (fs.existsSync(LOCK_PATH)) {
  fs.unlinkSync(LOCK_PATH);
}

if (!byPort && !byName) {
  console.log('  Nincs futó Willhaben Pro példány.');
} else {
  console.log('  Korábbi példány leállítva. Indítható: npm start');
}
