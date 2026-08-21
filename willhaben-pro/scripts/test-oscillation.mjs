#!/usr/bin/env node
import { findNewAds, mergeSeenIds } from '../src/parse.mjs';

const idA = '1486375975';
const idB = '1734722960';

function ad(id) {
  return { id, title: 'Test', price: '1', location: 'W', url: 'http://x' };
}

let seen = [];
let marker = null;
let calibrated = false;

function tick(order, label) {
  const ads = order.map(ad);
  const r = findNewAds(ads, marker, calibrated, seen);
  seen = r.seenIds || seen;
  if (r.action === 'calibrate') {
    calibrated = true;
    marker = r.newMarker;
  }
  if (r.action === 'new') marker = r.newMarker;
  return { label, action: r.action, marker, msg: r.action === 'calibrate' ? 'CALIBRATE' : r.action };
}

const results = [];
results.push(tick([idA, idB], '1 calibrate'));
for (let i = 0; i < 6; i++) {
  results.push(tick(i % 2 ? [idB, idA] : [idA, idB], `osc ${i + 1}`));
}

const bad = results.filter((r) => r.action === 'calibrate' || r.msg?.includes('referencia'));
if (bad.length > 1) {
  console.error('✗ váltakozó referencia hurok:', bad);
  process.exit(1);
}

console.log('✓ két autó ID váltakozás — stabil (nincs újrakalibrálás)');
results.slice(1).forEach((r) => console.log(' ', r.label, r.action));
