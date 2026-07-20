import fs from 'fs';
import path from 'path';
import { getDataDir } from './config.mjs';

const LOCK = path.join(getDataDir(), 'agent.pid');
try {
  const pid = Number(fs.readFileSync(LOCK, 'utf8').trim());
  if (pid > 0) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* gone */
    }
  }
  fs.unlinkSync(LOCK);
} catch {
  /* no lock */
}
