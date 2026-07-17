#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  DEFAULT_EXCLUDE_KEYWORDS,
  matchExcludeKeyword,
  normalizeExcludeKeywords,
} from '../src/exclude-keywords.mjs';
import { parseAdDetailFromHtml } from '../src/ad-detail.mjs';

assert.deepEqual(normalizeExcludeKeywords(undefined), DEFAULT_EXCLUDE_KEYWORDS);
assert.deepEqual(normalizeExcludeKeywords([]), DEFAULT_EXCLUDE_KEYWORDS);
assert.deepEqual(normalizeExcludeKeywords(['taxi', 'unfall']), ['taxi', 'unfall']);

assert.equal(matchExcludeKeyword('Skoda Superb 2.0 TDI', ['ecoboost']), null);
assert.equal(matchExcludeKeyword('Ford Focus 1.0 EcoBoost', ['ecoboost']), 'ecoboost');
assert.equal(matchExcludeKeyword('Nur Export!', ['export']), 'export');

const sampleHtml = `<html><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"advertDetails":{"heading":"BMW 320","description":"Sehr gepflegt, kein EcoBoost Motor.","attributes":{"attribute":[{"name":"MOTOR","values":["Benzin"]}]}}}}}</script></html>`;
const text = parseAdDetailFromHtml(sampleHtml);
assert.match(text.toLowerCase(), /ecoboost/);
assert.equal(matchExcludeKeyword(text, ['ecoboost']), 'ecoboost');

console.log('✓ exclude keywords + ad-detail parse');
