import path from 'path';
import { getProfileDir } from './config.mjs';
import { dismissConsent } from './consent.mjs';
import { launchBrowser } from './browser.mjs';

const CHAT_URL = 'https://www.willhaben.at/iad/myprofile/chat';

console.log('\n  Willhaben Agent — bejelentkezés\n');
console.log('  1. Megnyílik a böngésző');
console.log('  2. Jelentkezz be a willhaben.at-ra');
console.log('  3. Várj, amíg megjelennek a chat üzenetek');
console.log('  4. Zárd be a böngészőt\n');

const { context } = await launchBrowser(getProfileDir(), { headless: false });
const page = context.pages()[0] || (await context.newPage());

await page.goto(CHAT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await dismissConsent(page);

console.log('  Bejelentkezés folyamatban…');

const loggedIn = await page.waitForURL(
  (url) => /myprofile\/chat/i.test(url.href) && !/login|sso\.willhaben/i.test(url.href),
  { timeout: 300000 },
).then(async () => {
  const onLogin = await page.locator('input[type="password"]').first().isVisible({ timeout: 2000 }).catch(() => false);
  return !onLogin;
}).catch(() => false);

if (!loggedIn) {
  console.error('\n  ❌ Nem sikerült bejelentkezni, vagy nem érkeztél el a chat oldalra.');
  console.error('  Próbáld újra: npm run login\n');
  await context.close().catch(() => {});
  process.exit(1);
}

await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(2000);

const chatVisible = await page.locator('[data-testid*="conversation"], a[href*="/iad/myprofile/chat/"], main')
  .first()
  .isVisible({ timeout: 10000 })
  .catch(() => false);

console.log(chatVisible
  ? '\n  ✓ Bejelentkezés OK — chat oldal betöltve.'
  : '\n  ⚠ Bejelentkezés mentve, de a chat lista nem látszik biztosan.');

await new Promise((resolve) => context.on('close', resolve));
console.log('\n  Bejelentkezés mentve. Indítás: npm start\n');
