import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';
import { fileURLToPath } from 'url';
import {
  getWillhabenRoot,
  getHasznaltautoRoot,
  getOrchestratorRoot,
} from './program-paths.mjs';

const ORCH_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_BASE = 'https://raw.githubusercontent.com/bocsatech/bocsa-app/main';

const WILLHABEN_REL_FILES = [
  'src/parse.mjs',
  'src/index.mjs',
  'src/state.mjs',
  'src/config.mjs',
  'src/instance-lock.mjs',
  'src/stop.mjs',
  'src/message.mjs',
  'src/exclude-keywords.mjs',
  'src/ad-detail.mjs',
  'src/admin-server.mjs',
  'config.default.json',
];

const HASZNALTAUTO_REL_FILES = [...WILLHABEN_REL_FILES];

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function isOldWillhaben() {
  const indexText = readText(path.join(getWillhabenRoot(), 'src/index.mjs'));
  const messageText = readText(path.join(getWillhabenRoot(), 'src/message.mjs'));
  return (
    indexText.includes('Kalibrálás → referencia') ||
    !messageText.includes('excludeKeywords')
  );
}

function isOldHasznaltauto() {
  const text = readText(path.join(getHasznaltautoRoot(), 'src/index.mjs'));
  return (
    text.includes('Kalibrálás → referencia') ||
    (text.includes("result.action === 'recalibrate'") && !text.includes('urlSeenIds'))
  );
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
    const content = await downloadRaw(`willhaben-pro/${rel}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  }
}

async function downloadHasznaltautoFiles() {
  const root = getHasznaltautoRoot();
  for (const rel of HASZNALTAUTO_REL_FILES) {
    const dest = path.join(root, rel);
    const content = await downloadRaw(`hasznaltauto-pro/${rel}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  }
}

export function resetAllSlotCalibration() {
  const instDir = path.join(getOrchestratorRoot(), 'data', 'instances');
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
      /* skip */
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

  try {
    if (needsWh) await downloadWillhabenFiles();
    if (needsHa) await downloadHasznaltautoFiles();
  } catch (err) {
    return { ok: false, updated: false, error: err?.message || String(err) };
  }

  const slotsReset = resetAllSlotCalibration();
  console.log(`  ✓ Kalibráció-javítás (download) — ${slotsReset} slot state nullázva`);
  return { ok: true, updated: true, method: 'download', slotsReset };
}
