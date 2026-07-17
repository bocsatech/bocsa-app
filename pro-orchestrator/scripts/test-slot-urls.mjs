#!/usr/bin/env node
/** URL mentés: orchestrator config elsődleges, nem a régi instance. */
import assert from 'node:assert/strict';
import { normalizeWatchUrlsForSlot } from '../src/config.mjs';

function pickWatchUrls(slot) {
  return normalizeWatchUrlsForSlot(slot.watchUrls);
}

const inst = {
  watchUrls: [{ id: 'url-1', label: 'BMW régi', url: 'https://old.example/motorrad', enabled: true }],
};

const saved = {
  watchUrls: [
    {
      id: 'url-1',
      label: 'BMW',
      url: 'https://www.willhaben.at/iad/gebrauchtwagen/auto/gebrauchtwagenboerse?sfId=7d781db0',
      enabled: true,
    },
  ],
};

const emptySave = { watchUrls: [] };
const missingSave = {};

assert.equal(pickWatchUrls(saved)[0].url, saved.watchUrls[0].url);
assert.notEqual(pickWatchUrls(saved)[0].url, inst.watchUrls[0].url);
assert.deepEqual(pickWatchUrls(emptySave), []);
assert.deepEqual(pickWatchUrls(missingSave), []);

console.log('✓ watchUrls mentés — orchestrator config elsődleges, instance fallback nincs');
