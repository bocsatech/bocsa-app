import path from 'path';
import { getRoot } from './config.mjs';
import { dismissConsent } from './consent.mjs';
import { launchBrowser } from './browser.mjs';

const PROFILE_DIR = path.join(getRoot(), 'data', 'browser-profile');

console.log('\n  Hasznaltauto Pro — bejelentkezés (opcionális)\n');
console.log('  1. Megnyílik a böngésző (Google Chrome, ha telepítve van)');
console.log('  2. Fogadd el a süti ablakot');
console.log('  3. Ha kell, jelentkezz be a hasznaltauto.hu-ra');
console.log('  4. Zárd be a böngészőt ha kész\n');

const { context, browserName } = await launchBrowser(PROFILE_DIR, { headless: false });
console.log(`  Böngésző: ${browserName}\n`);

const page = context.pages()[0] || (await context.newPage());
await page.goto('https://www.hasznaltauto.hu/', { waitUntil: 'domcontentloaded' });
await dismissConsent(page);

await new Promise((resolve) => {
  context.on('close', resolve);
  console.log('  Várakozás — zárd be a böngészőablakot ha kész...\n');
});

console.log('  Profil mentve. Indítsd: npm start\n');
