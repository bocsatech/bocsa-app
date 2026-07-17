import path from 'path';
import { getInstanceDir } from './config.mjs';
import { dismissConsent } from './consent.mjs';
import { launchBrowser } from './browser.mjs';

const PROFILE_DIR = path.join(getInstanceDir(), 'browser-profile');

console.log('\n  Mobile.de Pro — bejelentkezés (opcionális)\n');
console.log('  1. Megnyílik a böngésző');
console.log('  2. Fogadd el a süti ablakot');
console.log('  3. Ha kell, jelentkezz be mobile.de-re');
console.log('  4. Zárd be a böngészőt ha kész\n');

const { context, browserName } = await launchBrowser(PROFILE_DIR, { headless: false });
console.log(`  Böngésző: ${browserName}\n`);

const page = context.pages()[0] || (await context.newPage());
await page.goto('https://www.mobile.de/', { waitUntil: 'domcontentloaded' });
await dismissConsent(page);

await new Promise((resolve) => {
  context.on('close', resolve);
  console.log('  Várakozás — zárd be a böngészőablakot ha kész...\n');
});

console.log('  Profil mentve. Indítsd: npm start\n');
