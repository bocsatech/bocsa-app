import { getProfileDir } from './config.mjs';
import { dismissConsent } from './consent.mjs';
import { launchBrowser } from './browser.mjs';
import { extractAccessToken, installNetworkCapture, saveCapturedRaw } from './messenger-api.mjs';

const CHAT_URL = 'https://www.willhaben.at/iad/myprofile/chat';

function pause(msg) {
  if (msg) console.log(msg);
  console.log('\n  Nyomj Enter-t a bezáráshoz…');
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once('data', () => resolve());
  });
}

async function doLogin(context, page, captured) {
  console.log('  → Chat oldal betöltése…');
  await page.goto(CHAT_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.bringToFront().catch(() => {});
  await dismissConsent(page);

  console.log('  Bejelentkezés folyamatban… (max 5 perc)');
  console.log('  Ha nem látod az ablakot: nézd a Dock-ot / Mission Control-t.\n');

  const loggedIn = await page.waitForURL(
    (url) => /myprofile\/chat/i.test(url.href) && !/login|sso\.willhaben/i.test(url.href),
    { timeout: 300000 },
  ).then(async () => {
    const onLogin = await page.locator('input[type="password"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    return !onLogin;
  }).catch(() => false);

  if (!loggedIn) {
    throw new Error('Nem sikerült bejelentkezni, vagy nem értél a chat oldalra.');
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

  console.log('\n  ✓ Kész — zárd be a böngészőablakot (piros X).\n');
  await new Promise((resolve) => context.on('close', resolve));
  console.log('  Bejelentkezés mentve. Következő: asztali SZINKRON ikon\n');
}

console.log('\n  Willhaben Agent — bejelentkezés\n');
console.log('  1. Most megnyílik egy böngészőablak (Chromium)');
console.log('  2. Jelentkezz be a willhaben.at-ra');
console.log('  3. Várj, amíg LÁTOD a chat üzenetlistát');
console.log('  4. Csak utána zárd be a böngészőt\n');

let context;
try {
  const launched = await launchBrowser(getProfileDir(), { headless: false });
  context = launched.context;
  let page = launched.page || context.pages()[0] || (await context.newPage());
  const captured = installNetworkCapture(page);

  try {
    await doLogin(context, page, captured);
  } catch (err) {
    if (!/crash|Target closed|Page crashed/i.test(err.message || '')) throw err;

    console.log('\n  ⚠ Böngésző összeomlott — újraindítás Playwright Chromiummal…\n');
    await context.close().catch(() => {});
    const relaunch = await launchBrowser(getProfileDir(), { headless: false });
    context = relaunch.context;
    page = relaunch.page || context.pages()[0] || (await context.newPage());
    const captured2 = installNetworkCapture(page);
    await doLogin(context, page, captured2);
  }
} catch (err) {
  console.error('\n  ❌ HIBA:', err.message || err);
  await pause('');
  await context?.close().catch(() => {});
  process.exit(1);
}
