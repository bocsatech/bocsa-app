#!/usr/bin/env node
import assert from 'node:assert/strict';
import { normalizePhone, isAllowedMobile } from '../src/phone.mjs';
import { validateWatchUrl } from '../src/parse.mjs';

assert.equal(normalizePhone('0176 12345678'), '+4917612345678');
assert.equal(normalizePhone('+49 176 12345678'), '+4917612345678');
assert.ok(isAllowedMobile('+4917612345678', ['15', '16', '17']));

const url =
  'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&st=FSBO';
assert.equal(validateWatchUrl(url).ok, true);
assert.equal(validateWatchUrl('https://www.mobile.de/auto/123').ok, false);

console.log('✓ mobilede-pro phone + URL');
