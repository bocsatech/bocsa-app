import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONFIG_PATH = path.join(ROOT, 'config.json');
const DEFAULT_CONFIG_PATH = path.join(ROOT, 'config.default.json');

export function getRoot() {
  return ROOT;
}

export function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
      fs.copyFileSync(DEFAULT_CONFIG_PATH, CONFIG_PATH);
    }
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

export function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
