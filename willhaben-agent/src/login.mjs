import path from 'path';
import { getProfileDir } from './config.mjs';
import { dismissConsent } from './consent.mjs';
import { launchBrowser } from './browser.mjs';

console.log('\n  Willhaben Agent — bejelentkezés\n');
console.log('  1. Megnyílik a böngésző');
console.log('  2. Jelentkezz be a willhaben.at-ra');
console.log('  3. Zárd be a böngészőt\n');

const { context } = await launchBrowser(getProfileDir(), { headless: false });
const page = context.pages()[0] || (await context.newPage());
await page.goto('https://www.willhaben.at/iad/myprofile/chat', { waitUntil: 'domcontentloaded' });
await dismissConsent(page);

await new Promise((resolve) => context.on('close', resolve));
console.log('\n  Bejelentkezés mentve. Indítás: npm start\n');
