import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getWillhabenRoot,
  getWillhabenVendorRoot,
  isWillhabenInstalled,
} from './willhaben-root.mjs';

const ORCH_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.dirname(ORCH_ROOT);

const SKIP = new Set(['node_modules', '.git']);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function removeDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) removeDir(target);
    else fs.unlinkSync(target);
  }
  fs.rmdirSync(dir);
}

export function syncWillhabenProToDownloads() {
  const target = getWillhabenRoot();
  const legacyRepo = path.join(REPO_ROOT, 'willhaben-pro');
  const vendor = getWillhabenVendorRoot(REPO_ROOT);
  let action = null;

  if (fs.existsSync(legacyRepo) && !isWillhabenInstalled(target)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.renameSync(legacyRepo, target);
    action = 'moved-legacy';
  } else if (fs.existsSync(legacyRepo) && isWillhabenInstalled(target)) {
    removeDir(legacyRepo);
    action = 'removed-legacy';
  } else if (!isWillhabenInstalled(target) && fs.existsSync(path.join(vendor, 'package.json'))) {
    copyDir(vendor, target);
    action = 'copied-vendor';
  }

  if (fs.existsSync(legacyRepo)) {
    removeDir(legacyRepo);
    action = action ? `${action}+removed-legacy` : 'removed-legacy';
  }

  return {
    ok: isWillhabenInstalled(target),
    path: target,
    action,
  };
}
