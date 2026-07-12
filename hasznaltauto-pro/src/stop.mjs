import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getRoot, loadConfig } from './config.mjs';

const LOCK_PATH = path.join(getRoot(), 'data', '.instance.lock');

function killPid(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 'SIGTERM');
    console.log(`  Leállítva (PID ${pid})`);
    return true;
  } catch {
    return false;
  }
}

function killOnPort(port) {
  try {
    const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    let killed = false;
    for (const pid of pids) {
      if (killPid(Number(pid))) killed = true;
    }
    return killed;
  } catch {
    return false;
  }
}

function killFromLock() {
  if (!fs.existsSync(LOCK_PATH)) return false;
  const raw = fs.readFileSync(LOCK_PATH, 'utf8').trim();
  const pid = Number.parseInt(raw, 10);
  const killed = killPid(pid);
  try {
    fs.unlinkSync(LOCK_PATH);
  } catch {
    /* ignore */
  }
  return killed;
}

const config = loadConfig();
const port = config.adminPort ?? 3848;

const byLock = killFromLock();
const byPort = killOnPort(port);

if (!byLock && !byPort) {
  console.log('  Nincs futó Hasznaltauto Pro példány.');
} else {
  console.log('  Korábbi példány leállítva. Indítható: npm start');
}
