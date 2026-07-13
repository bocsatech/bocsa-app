import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONFIG_PATH = path.join(ROOT, 'config.json');

const DEFAULT_SLOTS = Array.from({ length: 6 }, (_, i) => ({
  id: `slot-${i + 1}`,
  label: `Slot ${i + 1}`,
  program: i < 3 ? 'willhaben' : 'hasznaltauto',
  username: '',
  watchUrls: [],
}));

function normalizeWatchUrls(urls) {
  if (!Array.isArray(urls)) return [];
  return urls.map((u, i) => ({
    id: String(u.id || `url-${i + 1}`).trim(),
    label: String(u.label || `URL ${i + 1}`).trim(),
    url: String(u.url || '').trim(),
    enabled: u.enabled !== false,
  }));
}

export function getRoot() {
  return ROOT;
}

export function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const cfg = { adminPort: 3850, slots: DEFAULT_SLOTS };
    saveConfig(cfg);
    return cfg;
  }
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  cfg.slots = normalizeSlots(cfg.slots);
  return cfg;
}

export function saveConfig(config) {
  const next = {
    adminPort: config.adminPort ?? 3850,
    slots: normalizeSlots(config.slots),
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2));
}

function normalizeSlots(slots) {
  const list = Array.isArray(slots) ? slots : [];
  return DEFAULT_SLOTS.map((def, i) => {
    const incoming = list.find((s) => s.id === def.id) || list[i] || {};
    const program = incoming.program === 'hasznaltauto' ? 'hasznaltauto' : 'willhaben';
    return {
      id: def.id,
      label: String(incoming.label || def.label).trim() || def.label,
      program,
      username: String(incoming.username || '').trim(),
      watchUrls: normalizeWatchUrls(incoming.watchUrls),
    };
  });
}
