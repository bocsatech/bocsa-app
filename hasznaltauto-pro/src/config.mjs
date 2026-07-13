import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONFIG_PATH = path.join(ROOT, 'config.json');

export function getRoot() {
  return ROOT;
}

export function getInstanceDir() {
  if (process.env.PRO_INSTANCE_DIR) {
    return path.resolve(process.env.PRO_INSTANCE_DIR);
  }
  return path.join(ROOT, 'data');
}

export function getConfigPath() {
  if (process.env.PRO_INSTANCE_DIR) {
    return path.join(getInstanceDir(), 'config.json');
  }
  return CONFIG_PATH;
}

export function resolveAdminPort(config, fallback = 3848) {
  if (process.env.PRO_ADMIN_PORT) {
    const n = Number(process.env.PRO_ADMIN_PORT);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return config.adminPort ?? fallback;
}

export function loadConfig() {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    throw new Error(`Hiányzó config: ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

export function saveConfig(config) {
  const dir = path.dirname(getConfigPath());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}
