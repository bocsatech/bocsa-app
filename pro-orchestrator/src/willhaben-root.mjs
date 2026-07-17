import fs from 'fs';
import path from 'path';
import os from 'os';

const DIR_NAMES = ['willhaben pro', 'willhaben-pro'];

export function getWillhabenRoot() {
  if (process.env.WILLHABEN_PRO_ROOT) {
    return path.resolve(process.env.WILLHABEN_PRO_ROOT);
  }

  const home = os.homedir();
  for (const name of DIR_NAMES) {
    const candidate = path.join(home, 'Downloads', name);
    if (fs.existsSync(path.join(candidate, 'package.json'))) {
      return candidate;
    }
  }

  return path.join(home, 'Downloads', 'willhaben pro');
}

export function getWillhabenVendorRoot(repoRoot) {
  return path.join(repoRoot, 'pro-orchestrator', 'vendor', 'willhaben-pro');
}

export function isWillhabenInstalled(root = getWillhabenRoot()) {
  return fs.existsSync(path.join(root, 'package.json'));
}
