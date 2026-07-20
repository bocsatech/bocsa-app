import fs from 'fs';
import path from 'path';
import { getDataDir } from './config.mjs';

const LOCK = path.join(getDataDir(), 'agent.pid');

export function acquireLock() {
  fs.mkdirSync(getDataDir(), { recursive: true });
  if (fs.existsSync(LOCK)) {
    const old = Number(fs.readFileSync(LOCK, 'utf8').trim());
    if (old > 0 && old !== process.pid) {
      try {
        process.kill(old, 0);
        throw new Error(`Már fut (PID ${old}). npm run stop`);
      } catch (e) {
        if (e.code !== 'ESRCH') throw e;
      }
    }
  }
  fs.writeFileSync(LOCK, String(process.pid));
}

export function releaseLock() {
  try {
    if (fs.existsSync(LOCK) && Number(fs.readFileSync(LOCK, 'utf8')) === process.pid) {
      fs.unlinkSync(LOCK);
    }
  } catch {
    /* ok */
  }
}
