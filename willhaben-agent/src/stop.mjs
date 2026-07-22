import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { loadConfig, resolvePort, getDataDir, getProfileDir } from './config.mjs';
import { unlockProfile } from './browser.mjs';

const LOCK = path.join(getDataDir(), 'agent.pid');

function killPid(pid) {
  const n = Number(pid);
  if (!Number.isFinite(n) || n <= 0 || n === process.pid) return false;
  try {
    process.kill(n, 'SIGTERM');
    return true;
  } catch {
    return false;
  }
}

function pidsOnPort(port) {
  try {
    const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN 2>/dev/null || true`, {
      encoding: 'utf8',
    }).trim();
    if (!out) return [];
    return [...new Set(out.split('\n').map((s) => Number(s.trim())).filter((n) => n > 0))];
  } catch {
    return [];
  }
}

function killPort(port) {
  let killed = 0;
  for (const pid of pidsOnPort(port)) {
    if (killPid(pid)) killed += 1;
  }
  return killed;
}

function readLockPid() {
  try {
    return Number(fs.readFileSync(LOCK, 'utf8').trim());
  } catch {
    return 0;
  }
}

function clearLock() {
  try {
    fs.unlinkSync(LOCK);
  } catch {
    /* no lock */
  }
}

const port = resolvePort(loadConfig());
const lockPid = readLockPid();
let stopped = 0;

if (lockPid > 0) {
  if (killPid(lockPid)) stopped += 1;
}

stopped += killPort(port);
clearLock();

if (stopped > 0) {
  try {
    execSync('sleep 0.4');
  } catch {
    /* ok */
  }
}

const remaining = pidsOnPort(port);
if (remaining.length) {
  for (const pid of remaining) killPid(pid);
  try {
    execSync('sleep 0.3');
  } catch {
    /* ok */
  }
}

const still = pidsOnPort(port);
if (still.length) {
  console.error(`A ${port} port még foglalt (PID: ${still.join(', ')}).`);
  console.error('Próbáld: kill -9 ' + still.join(' '));
  process.exit(1);
}

try {
  unlockProfile(getProfileDir());
} catch {
  /* ok */
}

if (stopped > 0) {
  console.log(`Leállítva (${port}).`);
}
