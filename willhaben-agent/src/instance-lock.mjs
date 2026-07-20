import fs from 'fs';
import path from 'path';
import { getDataDir } from './config.mjs';

const LOCK = path.join(getDataDir(), 'agent.pid');

export function acquireLock() {
  const dir = getDataDir();
  fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(LOCK)) {
    const old = Number(fs.readFileSync(LOCK, 'utf8').trim());
    if (old > 0 && old !== process.pid) {
      try {
        process.kill(old, 0);
        throw new Error(`Már fut egy példány (PID ${old}). Futtasd: npm run stop`);
      } catch (e) {
        if (e.code !== 'ESRCH') throw e;
      }
    }
  }

  fs.writeFileSync(LOCK, String(process.pid));
}

export function releaseLock() {
  try {
    if (fs.existsSync(LOCK)) {
      const pid = Number(fs.readFileSync(LOCK, 'utf8').trim());
      if (pid === process.pid) fs.unlinkSync(LOCK);
    }
  } catch {
    /* ok */
  }
}
