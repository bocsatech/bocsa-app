import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';
import { fileURLToPath } from 'url';
import { getWillhabenRoot } from './willhaben-root.mjs';

const ORCH_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.dirname(ORCH_ROOT);
const RAW_BASE = 'https://raw.githubusercontent.com/bocsatech/bocsa-app/main';

const WILLHABEN_REL_FILES = [
  'src/parse.mjs',
  'src/index.mjs',
  'src/state.mjs',
  'src/config.mjs',
  'src/instance-lock.mjs',
  'src/stop.mjs',
];

const HASZNALTAUTO_FILES = [
  'hasznaltauto-pro/src/parse.mjs',
  'hasznaltauto-pro/src/index.mjs',
  'hasznaltauto-pro/src/state.mjs',
  'hasznaltauto-pro/src/config.mjs',
  'hasznaltauto-pro/src/instance-lock.mjs',
  'hasznaltauto-pro/src/stop.mjs',
];

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function isOldWillhaben() {
  const text = readText(path.join(getWillhabenRoot(), 'src/index.mjs'));
  return text.includes('Kalibrálás → referencia');
}

function isOldHasznaltauto() {
  const text = readText(path.join(REPO_ROOT, 'hasznaltauto-pro/src/index.mjs'));
  return (
    text.includes('Kalibrálás → referencia') ||
    (text.includes("result.action === 'recalibrate'") && !text.includes('urlSeenIds'))
  );
}

function tryGitUpdate() {
  try {
    execSync('git fetch origin main', { cwd: REPO_ROOT, stdio: 'pipe', timeout: 90000 });
    execSync('git reset --hard origin/main', { cwd: REPO_ROOT, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function downloadRaw(rel) {
  return new Promise((resolve, reject) => {
    const url = `${RAW_BASE}/${rel}`;
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`${rel}: HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      })
      .on('error', reject);
  });
}

async function downloadWillhabenFiles() {
  const root = getWillhabenRoot();
  for (const rel of WILLHABEN_REL_FILES) {
    const dest = path.join(root, rel);
    const content = await downloadRaw(`pro-orchestrator/vendor/willhaben-pro/${rel}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  }
}

async function downloadHasznaltautoFiles() {
  for (const rel of HASZNALTAUTO_FILES) {
    const dest = path.join(REPO_ROOT, rel);
    const content = await downloadRaw(rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  }
}

export function resetAllSlotCalibration() {
  const instDir = path.join(ORCH_ROOT, 'data', 'instances');
  if (!fs.existsSync(instDir)) return 0;
  let n = 0;
  for (const slot of fs.readdirSync(instDir)) {
    const sf = path.join(instDir, slot, 'state.json');
    if (!fs.existsSync(sf)) continue;
    try {
      const s = JSON.parse(fs.readFileSync(sf, 'utf8'));
      const had =
        Object.keys(s.urlMarkers || {}).length ||
        Object.keys(s.urlCalibrated || {}).length ||
        Object.keys(s.urlSeenIds || {}).length;
      if (!had) continue;
      s.urlMarkers = {};
      s.urlCalibrated = {};
      s.urlSeenIds = {};
      fs.writeFileSync(sf, JSON.stringify(s, null, 2));
      n += 1;
    } catch {
      /* skip corrupt state */
    }
  }
  return n;
}

export async function ensureCalibrationFix() {
  const needsWh = isOldWillhaben();
  const needsHa = isOldHasznaltauto();
  if (!needsWh && !needsHa) {
    return { ok: true, updated: false };
  }

  let method = null;
  if (tryGitUpdate() && !isOldWillhaben() && !isOldHasznaltauto()) {
    method = 'git';
  } else {
    try {
      if (needsWh) await downloadWillhabenFiles();
      if (needsHa) await downloadHasznaltautoFiles();
      method = 'download';
    } catch (err) {
      return { ok: false, updated: false, error: err?.message || String(err) };
    }
  }

  const slotsReset = resetAllSlotCalibration();
  console.log(`  ✓ Kalibráció-javítás (${method}) — ${slotsReset} slot state nullázva`);
  return { ok: true, updated: true, method, slotsReset };
}
