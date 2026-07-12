import fs from 'fs';
import path from 'path';
import { getRoot } from './config.mjs';

const STATE_PATH = path.join(getRoot(), 'data', 'state.json');

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
  if (!fs.existsSync(STATE_PATH)) {
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(DEFAULT_STATE, null, 2));
  }
  return { ...DEFAULT_STATE, ...JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')) };
}

export function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  state.log = (state.log || []).slice(0, 200);
  state.sentAdIds = (state.sentAdIds || []).slice(-500);
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
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
