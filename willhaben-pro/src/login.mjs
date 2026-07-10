import { chromium } from 'playwright';
import path from 'path';
import { getRoot } from './config.mjs';
import { dismissConsent } from './consent.mjs';

const PROFILE_DIR = path.join(getRoot(), 'data', 'browser-profile');

console.log('\n  Willhaben Pro — bejelentkezés\n');
console.log('  1. Megnyílik a Chrome');
console.log('  2. Fogadd el a süti ablakot (Akzeptieren)');
console.log('  3. Jelentkezz be a willhaben.at-ra');
console.log('  4. Zárd be a böngészőt ha kész\n');

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: false,
  viewport: { width: 1280, height: 900 },
});

const page = context.pages()[0] || (await context.newPage());
await page.goto('https://www.willhaben.at/iad/gebrauchtwagen', { waitUntil: 'domcontentloaded' });
await dismissConsent(page);

await new Promise((resolve) => {
  context.on('close', resolve);
  console.log('  Várakozás — zárd be a böngészőablakot bejelentkezés után...\n');
});

console.log('  Bejelentkezés mentve. Indítsd: npm start\n');
