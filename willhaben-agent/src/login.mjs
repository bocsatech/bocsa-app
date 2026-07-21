import { getProfileDir } from './config.mjs';
import { dismissConsent } from './consent.mjs';
import { launchBrowser } from './browser.mjs';
import { extractAccessToken, installNetworkCapture, saveCapturedRaw } from './messenger-api.mjs';

const CHAT_URL = 'https://www.willhaben.at/iad/myprofile/chat';

console.log('\n  Willhaben Agent — bejelentkezés\n');
console.log('  1. Megnyílik a böngésző');
console.log('  2. Jelentkezz be a willhaben.at-ra');
console.log('  3. Várj, amíg LÁTOD a chat üzenetlistát');
console.log('  4. Csak utána zárd be a böngészőt\n');

const { context } = await launchBrowser(getProfileDir(), { headless: false });
const page = context.pages()[0] || (await context.newPage());
const captured = installNetworkCapture(page);

await page.goto(CHAT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await dismissConsent(page);

console.log('  Bejelentkezés folyamatban… (max 5 perc)');

const loggedIn = await page.waitForURL(
  (url) => /myprofile\/chat/i.test(url.href) && !/login|sso\.willhaben/i.test(url.href),
  { timeout: 300000 },
).then(async () => {
  const onLogin = await page.locator('input[type="password"]').first().isVisible({ timeout: 2000 }).catch(() => false);
  return !onLogin;
}).catch(() => false);

if (!loggedIn) {
  console.error('\n  ❌ Nem sikerült bejelentkezni.');
  console.error('  Próbáld újra az asztali LOGIN ikont.\n');
  await context.close().catch(() => {});
  process.exit(1);
}

await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(3000);

const token = await extractAccessToken(page);
const chatVisible = await page.locator(
  'a[href*="/iad/myprofile/chat/"], [data-testid*="conversation"], [role="listitem"], main li',
).first().isVisible({ timeout: 15000 }).catch(() => false);

if (token) console.log('  ✓ OAuth token mentve');
else console.log('  ⚠ Token még nem látszik — várd meg a chat listát, majd zárd be');

if (chatVisible) console.log('  ✓ Chat lista látható');
else console.log('  ⚠ Chat lista még nem biztos — várj, amíg megjelennek az üzenetek');

if (captured.length) {
  const file = saveCapturedRaw(captured);
  if (file) console.log(`  ✓ Hálózati capture: ${file}`);
}

console.log('\n  Zárd be a böngészőt, ha kész.\n');
await new Promise((resolve) => context.on('close', resolve));
console.log('  Bejelentkezés mentve. Következő: asztali SZINKRON ikon\n');
