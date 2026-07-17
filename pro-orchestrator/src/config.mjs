import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONFIG_PATH = path.join(ROOT, 'config.json');

const DEFAULT_PREFIXES = ['70', '20', '30'];

const DEFAULT_SMS = {
  provider: 'twilio',
  accountSid: '',
  authToken: '',
  fromNumber: '',
  dryRun: true,
};

function defaultTiming(program) {
  return program === 'hasznaltauto'
    ? { pollIntervalSeconds: 30, sendDelayMs: 5000 }
    : { pollIntervalSeconds: 10, sendDelayMs: 3000 };
}

const DEFAULT_SLOTS = Array.from({ length: 6 }, (_, i) => {
  const program = i < 3 ? 'willhaben' : 'hasznaltauto';
  const timing = defaultTiming(program);
  return {
    id: `slot-${i + 1}`,
    label: `Slot ${i + 1}`,
    program,
    username: '',
    watchUrls: [],
    messageTemplate: '',
    pollIntervalSeconds: timing.pollIntervalSeconds,
    sendDelayMs: timing.sendDelayMs,
    allowedPrefixes: [...DEFAULT_PREFIXES],
    sms: { ...DEFAULT_SMS },
    autoStart: true,
  };
});

function normalizeAllowedPrefixes(value) {
  if (Array.isArray(value)) {
    return value.map((p) => String(p).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean);
  }
  return [...DEFAULT_PREFIXES];
}

function normalizeSms(sms) {
  const incoming = sms && typeof sms === 'object' ? sms : {};
  return {
    provider: 'twilio',
    accountSid: String(incoming.accountSid || '').trim(),
    authToken: String(incoming.authToken || '').trim(),
    fromNumber: String(incoming.fromNumber || '').trim(),
    dryRun: incoming.dryRun !== false,
  };
}

export function normalizePollInterval(value, program) {
  const n = Number(value);
  const min = program === 'hasznaltauto' ? 10 : 5;
  const fallback = defaultTiming(program).pollIntervalSeconds;
  return Number.isFinite(n) && n >= min ? Math.round(n) : fallback;
}

export function normalizeSendDelay(value, program) {
  const n = Number(value);
  const fallback = defaultTiming(program).sendDelayMs;
  return Number.isFinite(n) && n >= 2000 ? Math.round(n) : fallback;
}

export function mergeSmsSettings(incoming, previous, instance) {
  const prevSms = previous?.sms || {};
  const instSms = instance?.sms || {};
  const inc = incoming?.sms || {};
  const token = String(inc.authToken || '').trim();
  return {
    provider: 'twilio',
    accountSid: String(inc.accountSid ?? prevSms.accountSid ?? instSms.accountSid ?? '').trim(),
    authToken:
      token && token !== '***'
        ? token
        : String(prevSms.authToken || instSms.authToken || '').trim(),
    fromNumber: String(inc.fromNumber ?? prevSms.fromNumber ?? instSms.fromNumber ?? '').trim(),
    dryRun:
      inc.dryRun !== undefined
        ? inc.dryRun !== false
        : (prevSms.dryRun ?? instSms.dryRun ?? true) !== false,
  };
}

export function publicSmsForApi(sms) {
  const s = normalizeSms(sms);
  return {
    provider: s.provider,
    accountSid: s.accountSid,
    authToken: s.authToken ? '***' : '',
    fromNumber: s.fromNumber,
    dryRun: s.dryRun,
    hasAuthToken: !!s.authToken,
  };
}

function normalizeWatchUrls(urls) {
  if (!Array.isArray(urls)) return [];
  return urls.map((u, i) => ({
    id: String(u.id || `url-${i + 1}`).trim(),
    label: String(u.label || `URL ${i + 1}`).trim(),
    url: String(u.url || '').trim(),
    enabled: u.enabled !== false,
  }));
}

/** Orchestrator slot watchUrls — soha nem esik vissza instance/program sablonra. */
export function normalizeWatchUrlsForSlot(urls) {
  return normalizeWatchUrls(Array.isArray(urls) ? urls : []);
}

export function getRoot() {
  return ROOT;
}

export function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const cfg = { adminPort: 3850, autoStartOnLaunch: true, slots: DEFAULT_SLOTS };
    saveConfig(cfg);
    return cfg;
  }
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  cfg.adminPort = cfg.adminPort ?? 3850;
  cfg.autoStartOnLaunch = cfg.autoStartOnLaunch !== false;
  cfg.slots = normalizeSlots(cfg.slots);
  return cfg;
}

export function saveConfig(config) {
  const next = {
    adminPort: config.adminPort ?? 3850,
    autoStartOnLaunch: config.autoStartOnLaunch !== false,
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
      messageTemplate: String(incoming.messageTemplate || '').trim(),
      pollIntervalSeconds: normalizePollInterval(incoming.pollIntervalSeconds, program),
      sendDelayMs: normalizeSendDelay(incoming.sendDelayMs, program),
      allowedPrefixes: normalizeAllowedPrefixes(incoming.allowedPrefixes),
      sms: normalizeSms(incoming.sms || def.sms),
      autoStart: incoming.autoStart !== false,
    };
  });
}
