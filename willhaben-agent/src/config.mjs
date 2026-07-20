import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONFIG_PATH = path.join(ROOT, 'config.json');
const DEFAULT_CONFIG_PATH = path.join(ROOT, 'config.default.json');

export function getRoot() {
  return ROOT;
}

export function getDataDir() {
  if (process.env.AGENT_DATA_DIR) {
    return path.resolve(process.env.AGENT_DATA_DIR);
  }
  return path.join(ROOT, 'data');
}

export function getProfileDir() {
  return path.join(getDataDir(), 'browser-profile');
}

export function getConfigPath() {
  if (process.env.AGENT_DATA_DIR) {
    return path.join(getDataDir(), 'config.json');
  }
  return CONFIG_PATH;
}

export function resolvePort(config, fallback = 3860) {
  if (process.env.AGENT_PORT) {
    const n = Number(process.env.AGENT_PORT);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return config.adminPort ?? fallback;
}

export function loadConfig() {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    const defaultSrc = DEFAULT_CONFIG_PATH;
    if (fs.existsSync(defaultSrc)) {
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.copyFileSync(defaultSrc, configPath);
    }
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

export function saveConfig(config) {
  const dir = path.dirname(getConfigPath());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}
