import { chromium } from 'playwright';
import path from 'path';
import { getRoot } from './config.mjs';

const PROFILE_DIR = path.join(getRoot(), 'data', 'browser-profile');

console.log('\n  Willhaben Pro — bejelentkezés\n');
console.log('  1. Megnyílik a Chrome');
console.log('  2. Jelentkezz be a willhaben.at-ra');
console.log('  3. Zárd be a böngészőt ha kész\n');

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: false,
  viewport: { width: 1280, height: 900 },
});

const page = context.pages()[0] || (await context.newPage());
await page.goto('https://www.willhaben.at/iad/gebrauchtwagen', { waitUntil: 'domcontentloaded' });

await new Promise((resolve) => {
  context.on('close', resolve);
  console.log('  Várakozás — zárd be a böngészőablakot bejelentkezés után...\n');
});

console.log('  Bejelentkezés mentve. Indítsd: npm start\n');
