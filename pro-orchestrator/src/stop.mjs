import { execSync } from 'child_process';
import { loadConfig } from './config.mjs';

const config = loadConfig();
const port = config.adminPort ?? 3850;

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
  if (!pids.length) {
    console.log('  Nincs futó Pro Orchestrator példány.');
  }
} catch {
  console.log('  Nincs futó Pro Orchestrator példány.');
}
