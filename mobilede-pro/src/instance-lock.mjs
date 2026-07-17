import fs from 'fs';
import path from 'path';
import { getInstanceDir } from './config.mjs';

function lockPath() {
  return path.join(getInstanceDir(), '.instance.lock');
}

function isProcessAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function acquireInstanceLock() {
  const LOCK_PATH = lockPath();
  fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true });

  if (fs.existsSync(LOCK_PATH)) {
    const raw = fs.readFileSync(LOCK_PATH, 'utf8').trim();
    const existingPid = Number.parseInt(raw, 10);
    if (isProcessAlive(existingPid)) {
      return { ok: false, existingPid };
    }
    fs.unlinkSync(LOCK_PATH);
  }

  fs.writeFileSync(LOCK_PATH, String(process.pid));
  return { ok: true, pid: process.pid };
}

export function releaseInstanceLock() {
  const LOCK_PATH = lockPath();
  if (!fs.existsSync(LOCK_PATH)) return;
  const raw = fs.readFileSync(LOCK_PATH, 'utf8').trim();
  if (Number.parseInt(raw, 10) === process.pid) {
    fs.unlinkSync(LOCK_PATH);
  }
}
