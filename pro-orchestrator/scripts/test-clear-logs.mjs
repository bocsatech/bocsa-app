#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { clearSlotLogs, getSlotLogs } from '../src/slots.mjs';

const ORCH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(ORCH, 'data', 'instances', 'slot-1');
fs.mkdirSync(dir, { recursive: true });

const stateFile = path.join(dir, 'state.json');
fs.writeFileSync(
  stateFile,
  JSON.stringify({
    log: [
      { at: '2026-07-17T10:00:00.000Z', level: 'info', message: 'teszt 1' },
      { at: '2026-07-17T10:01:00.000Z', level: 'info', message: 'teszt 2' },
    ],
  })
);
fs.writeFileSync(path.join(dir, 'process.log'), 'raw line\n');

const before = getSlotLogs('slot-1');
if ((before.logs || []).length < 2) {
  console.error('✗ elötte kellene legyen napló');
  process.exit(1);
}

const r = clearSlotLogs('slot-1');
if (!r.ok || r.cleared !== 2) {
  console.error('✗ clearSlotLogs', r);
  process.exit(1);
}

const after = getSlotLogs('slot-1');
const empty = (after.logs || []).some((l) => l.includes('Még nincs napló') || l.includes('Várakozás'));
if (!empty) {
  console.error('✗ utána üres napló kellene', after.logs);
  process.exit(1);
}

const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
if (state.log?.length) {
  console.error('✗ state.log nem üres');
  process.exit(1);
}

console.log('✓ clearSlotLogs OK');
