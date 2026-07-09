#!/usr/bin/env node
const puppeteer = require('puppeteer-core');
const path = require('path');
const EXT = path.join(__dirname, 'chrome-extension');
const URL = 'https://www.willhaben.at/iad/gebrauchtwagen/auto/gebrauchtwagenboerse';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
    ],
  });
  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  try { await page.click('#didomi-notice-agree-button', { timeout: 3000 }); } catch (_) {}
  await new Promise((r) => setTimeout(r, 4000));
  const r = await page.evaluate(() => ({
    launcher: !!document.getElementById('wh-watcher-launcher'),
    panel: !!document.getElementById('wh-watcher-panel'),
    watcher: !!window.__WH_WATCHER__,
  }));
  console.log('EXTENSION TESZT:', r);
  await page.screenshot({ path: path.join(__dirname, 'extension-test.png') });
  await browser.close();
  process.exit(r.launcher ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
