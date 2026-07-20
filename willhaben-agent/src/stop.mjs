import fs from 'fs';
import path from 'path';
import { getDataDir } from './config.mjs';

const LOCK = path.join(getDataDir(), 'agent.pid');

function readPid() {
  try {
    return Number(fs.readFileSync(LOCK, 'utf8').trim());
  } catch {
    return 0;
  }
}

function removeLock() {
  try {
    fs.unlinkSync(LOCK);
  } catch {
    /* ok */
  }
}

const pid = readPid();
if (pid > 0) {
  try {
    process.kill(pid, 0);
    process.kill(pid, 'SIGTERM');
    console.log(`Leállítva (PID ${pid})`);
  } catch {
    /* not running */
  }
}
removeLock();
