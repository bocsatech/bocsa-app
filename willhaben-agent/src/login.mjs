import path from 'path';
import { getProfileDir } from './config.mjs';
import { dismissConsent } from './consent.mjs';
import { launchBrowser } from './browser.mjs';

const PROFILE_DIR = getProfileDir();

console.log('\n  Willhaben Agent — bejelentkezés\n');
console.log('  1. Megnyílik a böngésző');
console.log('  2. Fogadd el a süti ablakot (Akzeptieren)');
console.log('  3. Jelentkezz be a willhaben.at-ra');
console.log('  4. Zárd be a böngészőt ha kész\n');

const { context, browserName } = await launchBrowser(PROFILE_DIR, { headless: false });
console.log(`  Böngésző: ${browserName}\n`);

const page = context.pages()[0] || (await context.newPage());
await page.goto('https://www.willhaben.at/iad/myprofile/chat', { waitUntil: 'domcontentloaded' });
await dismissConsent(page);

await new Promise((resolve) => {
  context.on('close', resolve);
  console.log('  Várakozás — zárd be a böngészőablakot bejelentkezés után...\n');
});

console.log('  Bejelentkezés mentve. Indítsd: npm start\n');
