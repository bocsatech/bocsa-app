import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { getRoot, loadConfig, publicSmsForApi } from './config.mjs';

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

function readProgramDefaults(program) {
  const root = programRoot(program);
  const file = path.join(root, 'config.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function readProgramDefaultTemplate(program) {
  return String(readProgramDefaults(program).messageTemplate || '').trim();
}

export function getDefaultMessageTemplate(program) {
  return readProgramDefaultTemplate(program);
}

export function enrichSlot(slot) {
  const inst = readInstanceConfig(slot.id);
  const defaults = readProgramDefaults(slot.program);
  const fallbackTemplate = String(defaults.messageTemplate || '').trim();
  const prefixes =
    slot.allowedPrefixes?.length
      ? slot.allowedPrefixes
      : inst?.allowedPrefixes?.length
        ? inst.allowedPrefixes
        : defaults.allowedPrefixes || ['70', '20', '30'];
  const smsSource = slot.sms?.accountSid || slot.sms?.fromNumber || slot.sms?.authToken
    ? slot.sms
    : inst?.sms || defaults.sms || {};
  const enriched = {
    ...slot,
    watchUrls: inst?.watchUrls?.length ? inst.watchUrls : slot.watchUrls || [],
    messageTemplate: slot.messageTemplate || inst?.messageTemplate || fallbackTemplate,
    pollIntervalSeconds:
      slot.pollIntervalSeconds ??
      inst?.pollIntervalSeconds ??
      defaults.pollIntervalSeconds ??
      (slot.program === 'hasznaltauto' ? 30 : 10),
    sendDelayMs:
      slot.sendDelayMs ??
      inst?.sendDelayMs ??
      defaults.sendDelayMs ??
      (slot.program === 'hasznaltauto' ? 5000 : 3000),
    allowedPrefixes: prefixes,
    sms: publicSmsForApi(smsSource),
  };
  if (slot.program !== 'hasznaltauto') {
    delete enriched.allowedPrefixes;
    delete enriched.sms;
  }
  return enriched;
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
  cfg.pollIntervalSeconds =
    slot.pollIntervalSeconds ??
    readProgramDefaults(slot.program).pollIntervalSeconds ??
    (slot.program === 'hasznaltauto' ? 30 : 10);
  cfg.sendDelayMs =
    slot.sendDelayMs ??
    readProgramDefaults(slot.program).sendDelayMs ??
    (slot.program === 'hasznaltauto' ? 5000 : 3000);
  if (slot.program === 'hasznaltauto') {
    const prefixes = Array.isArray(slot.allowedPrefixes) ? slot.allowedPrefixes : [];
    cfg.allowedPrefixes = prefixes.length ? prefixes : ['70', '20', '30'];
    cfg.sms = {
      provider: 'twilio',
      accountSid: String(slot.sms?.accountSid || '').trim(),
      authToken: String(slot.sms?.authToken || '').trim(),
      fromNumber: String(slot.sms?.fromNumber || '').trim(),
      dryRun: slot.sms?.dryRun !== false,
    };
  }
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
  const pidAlive = !!(rt?.pid && isAlive(rt.pid));
  if (rt?.pid && !pidAlive) {
    clearRuntime(slot.id);
  }
  return {
    id: slot.id,
    running: pidAlive,
    pid: pidAlive ? rt.pid : null,
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

function readLastProcessError(dir) {
  const procFile = path.join(dir, 'process.log');
  if (!fs.existsSync(procFile)) return '';
  try {
    const lines = fs.readFileSync(procFile, 'utf8').split('\n').filter(Boolean).slice(-12);
    const hit = lines.find((l) =>
      /hiba|error|már fut|EADDRINUSE|foglalt|listen|exited/i.test(l)
    );
    return hit || lines[lines.length - 1] || '';
  } catch {
    return '';
  }
}

function prepareSlotStart(slotId) {
  const rt = readRuntime(slotId);
  if (rt?.pid && isAlive(rt.pid)) {
    return { ok: false, error: 'A slot már fut — előbb ■ Leállítás' };
  }
  killSlotProcesses(slotId);
  clearRuntime(slotId);
  return { ok: true };
}

export async function startSlot(slot) {
  const prep = prepareSlotStart(slot.id);
  if (!prep.ok) return prep;

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
    detached: true,
    stdio: ['ignore', out, out],
  });
  fs.closeSync(out);
  child.unref();

  child.on('exit', () => {
    const current = readRuntime(slot.id);
    if (current?.pid === child.pid) {
      clearRuntime(slot.id);
    }
  });

  writeRuntime(slot.id, {
    pid: child.pid,
    port,
    program: slot.program,
    username: slot.username,
    startedAt: new Date().toISOString(),
  });

  await new Promise((r) => setTimeout(r, 2000));

  if (!isAlive(child.pid)) {
    clearRuntime(slot.id);
    killSlotProcesses(slot.id);
    const errMsg = readLastProcessError(dir);
    return {
      ok: false,
      error:
        errMsg ||
        'A program azonnal leállt. Lehetséges ok: port foglalt, beragadt lock, vagy hiányzó Chrome.',
    };
  }

  return {
    ok: true,
    pid: child.pid,
    port,
    adminUrl: `http://127.0.0.1:${port}`,
  };
}

export async function restartSlot(slot) {
  stopSlot(slot.id);
  await new Promise((r) => setTimeout(r, 800));
  return startSlot(slot);
}

function killPid(pid) {
  if (!pid || pid <= 0 || !isAlive(pid)) return false;
  try {
    process.kill(pid, 'SIGTERM');
    return true;
  } catch {
    return false;
  }
}

function killSlotProcesses(slotId) {
  const rt = readRuntime(slotId);
  let stopped = false;

  if (killPid(rt?.pid)) stopped = true;

  const lock = path.join(instanceDir(slotId), '.instance.lock');
  if (fs.existsSync(lock)) {
    try {
      const lockPid = Number.parseInt(fs.readFileSync(lock, 'utf8'), 10);
      if (killPid(lockPid)) stopped = true;
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(lock);
    } catch {
      /* ignore */
    }
  }

  const port = slotPort(slotId);
  if (port) {
    try {
      const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf8' })
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((p) => Number(p));
      for (const pid of pids) {
        if (killPid(pid)) stopped = true;
      }
    } catch {
      /* port free */
    }
  }

  return stopped;
}

export function stopSlot(slotId) {
  const stopped = killSlotProcesses(slotId);
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

export function getSlotLogs(slotId, limit = 50) {
  const dir = instanceDir(slotId);
  const rt = readRuntime(slotId);
  const running = !!(rt?.pid && isAlive(rt.pid));
  const sinceMs = rt?.startedAt ? new Date(rt.startedAt).getTime() : null;
  const lines = [];
  let needsLogin = false;

  const stateFile = path.join(dir, 'state.json');
  if (fs.existsSync(stateFile)) {
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      let entries = Array.isArray(state.log) ? state.log : [];
      if (running && sinceMs) {
        entries = entries.filter((e) => new Date(e.at).getTime() >= sinceMs - 3000);
      }
      entries = entries.slice(0, limit);
      entries.reverse();
      for (const entry of entries) {
        const line = `[${entry.at?.slice(11, 19) || '?'}] ${entry.message}`;
        lines.push(line);
        const msg = entry.message || '';
        if (msg.includes('Nincs üzenetmező') || msg.includes('nincs bejelentkezve')) {
          needsLogin = true;
        }
      }
    } catch {
      /* ignore */
    }
  }

  const procFile = path.join(dir, 'process.log');
  if (fs.existsSync(procFile)) {
    try {
      const tail = fs.readFileSync(procFile, 'utf8').split('\n').filter(Boolean).slice(-10);
      for (const line of tail) {
        lines.push(`[proc] ${line}`);
      }
    } catch {
      /* ignore */
    }
  }

  if (!lines.length) {
    return {
      logs: running ? ['— Várakozás az első naplóbejegyzésre… —'] : ['— Még nincs napló —'],
      needsLogin: false,
      running,
    };
  }

  return { logs: lines.slice(-limit), needsLogin, running };
}
