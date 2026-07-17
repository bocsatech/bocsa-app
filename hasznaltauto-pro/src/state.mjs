import fs from 'fs';
import path from 'path';
import { getInstanceDir } from './config.mjs';

function statePath() {
  return path.join(getInstanceDir(), 'state.json');
}

const DEFAULT_STATE = {
  sentToday: 0,
  sentDate: '',
  totalSent: 0,
  startedAt: null,
  urlMarkers: {},
  urlCalibrated: {},
  sentAdIds: [],
  log: [],
};

export function loadState() {
  const file = statePath();
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(DEFAULT_STATE, null, 2));
  }
  return { ...DEFAULT_STATE, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
}

export function saveState(state) {
  const file = statePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  state.log = (state.log || []).slice(0, 200);
  state.sentAdIds = (state.sentAdIds || []).slice(-500);
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function appendLog(state, level, message) {
  const entry = {
    at: new Date().toISOString(),
    level,
    message,
  };
  state.log = [entry, ...(state.log || [])].slice(0, 200);
  const prefix = level === 'error' ? '✗' : level === 'ok' ? '✓' : '·';
  console.log(`[${entry.at.slice(11, 19)}] ${prefix} ${message}`);
}
