import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { getRoot, loadConfig } from './config.mjs';

const ORCH_ROOT = getRoot();
const REPO_ROOT = path.dirname(ORCH_ROOT);

const SLOT_PORTS = {
  'slot-1': 3851,
  'slot-2': 3852,
  'slot-3': 3853,
  'slot-4': 3854,
  'slot-5': 3855,
  'slot-6': 3856,
};

const RUNTIME_DIR = path.join(ORCH_ROOT, 'data', 'runtime');

function runtimePath(slotId) {
  return path.join(RUNTIME_DIR, `${slotId}.json`);
}

function instanceDir(slotId) {
  return path.join(ORCH_ROOT, 'data', 'instances', slotId);
}

function programRoot(program) {
  return program === 'hasznaltauto'
    ? path.join(REPO_ROOT, 'hasznaltauto-pro')
    : path.join(REPO_ROOT, 'willhaben-pro');
}

function isAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killPort(port) {
  try {
    const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    for (const pid of pids) {
      try {
        process.kill(Number(pid), 'SIGTERM');
      } catch {
        /* gone */
      }
    }
    return pids.length > 0;
  } catch {
    return false;
  }
}

function readRuntime(slotId) {
  const file = runtimePath(slotId);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeRuntime(slotId, data) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  fs.writeFileSync(runtimePath(slotId), JSON.stringify(data, null, 2));
}

function clearRuntime(slotId) {
  try {
    fs.unlinkSync(runtimePath(slotId));
  } catch {
    /* ignore */
  }
}

export function slotPort(slotId) {
  return SLOT_PORTS[slotId] ?? null;
}

function instanceConfigPath(slotId) {
  return path.join(instanceDir(slotId), 'config.json');
}

export function readInstanceConfig(slotId) {
  const file = instanceConfigPath(slotId);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function readProgramDefaultTemplate(program) {
  const root = programRoot(program);
  const file = path.join(root, 'config.json');
  try {
    const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
    return String(cfg.messageTemplate || '').trim();
  } catch {
    return '';
  }
}

export function getDefaultMessageTemplate(program) {
  return readProgramDefaultTemplate(program);
}

export function enrichSlot(slot) {
  const inst = readInstanceConfig(slot.id);
  const fallbackTemplate = readProgramDefaultTemplate(slot.program);
  return {
    ...slot,
    watchUrls: inst?.watchUrls?.length ? inst.watchUrls : slot.watchUrls || [],
    messageTemplate:
      slot.messageTemplate || inst?.messageTemplate || fallbackTemplate,
  };
}

function writeInstanceConfig(slot, cfg) {
  const dir = instanceDir(slot.id);
  fs.mkdirSync(dir, { recursive: true });
  const dest = instanceConfigPath(slot.id);
  fs.writeFileSync(dest, JSON.stringify(cfg, null, 2));
}

function applySlotFieldsToConfig(slot, cfg) {
  cfg.adminPort = slotPort(slot.id);
  if (Array.isArray(slot.watchUrls)) {
    cfg.watchUrls = slot.watchUrls.filter((u) => u.url);
  }
  const template = String(slot.messageTemplate || '').trim();
  cfg.messageTemplate = template || readProgramDefaultTemplate(slot.program);
  return cfg;
}

export function syncSlotToInstance(slot) {
  const { dir, root } = ensureInstance(slot);
  const dest = instanceConfigPath(slot.id);
  const cfg = fs.existsSync(dest)
    ? JSON.parse(fs.readFileSync(dest, 'utf8'))
    : JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
  applySlotFieldsToConfig(slot, cfg);
  writeInstanceConfig(slot, cfg);
  return { ok: true, dir };
}

/** @deprecated use syncSlotToInstance */
export function syncWatchUrlsToInstance(slot) {
  return syncSlotToInstance(slot);
}

export function ensureInstance(slot) {
  const dir = instanceDir(slot.id);
  fs.mkdirSync(dir, { recursive: true });
  const port = slotPort(slot.id);
  const root = programRoot(slot.program);
  const template = path.join(root, 'config.json');
  const dest = instanceConfigPath(slot.id);

  if (!fs.existsSync(template)) {
    throw new Error(`Nincs config sablon: ${template}`);
  }

  let cfg;
  if (fs.existsSync(dest)) {
    cfg = JSON.parse(fs.readFileSync(dest, 'utf8'));
  } else {
    cfg = JSON.parse(fs.readFileSync(template, 'utf8'));
  }

  applySlotFieldsToConfig(slot, cfg);
  writeInstanceConfig(slot, cfg);
  return { dir, port, root };
}

export function getSlotStatus(slot) {
  const rt = readRuntime(slot.id);
  const port = slotPort(slot.id);
  const running = !!(rt?.pid && isAlive(rt.pid));
  return {
    id: slot.id,
    running,
    pid: running ? rt.pid : null,
    port,
    adminUrl: port ? `http://127.0.0.1:${port}` : null,
    username: slot.username,
    program: slot.program,
    startedAt: rt?.startedAt || null,
  };
}

export function getAllSlotStatus() {
  const config = loadConfig();
  return config.slots.map(getSlotStatus);
}

export function startSlot(slot) {
  const existing = readRuntime(slot.id);
  if (existing?.pid && isAlive(existing.pid)) {
    return { ok: false, error: 'A slot már fut' };
  }

  const { dir, port, root } = ensureInstance(slot);
  const entry = path.join(root, 'src', 'index.mjs');
  const logFile = path.join(dir, 'process.log');
  const out = fs.openSync(logFile, 'a');

  const child = spawn(process.execPath, [entry], {
    cwd: root,
    env: {
      ...process.env,
      PRO_INSTANCE_DIR: dir,
      PRO_ADMIN_PORT: String(port),
    },
    detached: false,
    stdio: ['ignore', out, out],
  });

  child.unref();

  writeRuntime(slot.id, {
    pid: child.pid,
    port,
    program: slot.program,
    username: slot.username,
    startedAt: new Date().toISOString(),
  });

  return {
    ok: true,
    pid: child.pid,
    port,
    adminUrl: `http://127.0.0.1:${port}`,
  };
}

export function stopSlot(slotId) {
  const rt = readRuntime(slotId);
  let stopped = false;

  if (rt?.pid && isAlive(rt.pid)) {
    try {
      process.kill(rt.pid, 'SIGTERM');
      stopped = true;
    } catch {
      /* ignore */
    }
  }

  const port = slotPort(slotId);
  if (port && killPort(port)) stopped = true;

  const lock = path.join(instanceDir(slotId), '.instance.lock');
  try {
    fs.unlinkSync(lock);
  } catch {
    /* ignore */
  }

  clearRuntime(slotId);
  return { ok: true, stopped };
}

export function startLogin(slot) {
  const { dir, root } = ensureInstance(slot);
  const entry = path.join(root, 'src', 'login.mjs');
  const child = spawn(process.execPath, [entry], {
    cwd: root,
    env: { ...process.env, PRO_INSTANCE_DIR: dir },
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return { ok: true, pid: child.pid, message: 'Bejelentkezés Chrome megnyílt — zárd be ha kész' };
}

export function getSlotLogs(slotId, limit = 40) {
  const dir = instanceDir(slotId);
  const lines = [];

  const stateFile = path.join(dir, 'state.json');
  if (fs.existsSync(stateFile)) {
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      for (const entry of (state.log || []).slice(0, limit)) {
        lines.push(`[${entry.at?.slice(11, 19) || '?'}] ${entry.message}`);
      }
    } catch {
      /* ignore */
    }
  }

  const procFile = path.join(dir, 'process.log');
  if (fs.existsSync(procFile)) {
    try {
      const tail = fs.readFileSync(procFile, 'utf8').split('\n').filter(Boolean).slice(-15);
      for (const line of tail) {
        lines.push(`[proc] ${line}`);
      }
    } catch {
      /* ignore */
    }
  }

  if (!lines.length) {
    return ['— Még nincs napló —'];
  }

  return lines.slice(0, limit);
}
