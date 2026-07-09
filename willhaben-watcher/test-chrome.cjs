#!/usr/bin/env node
/**
 * Chrome CDP teszt — willhaben + userscript injektálás
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const TEST_URL =
  'https://www.willhaben.at/iad/gebrauchtwagen/auto/gebrauchtwagenboerse';
const SCRIPT_PATH = path.join(__dirname, 'willhaben-watcher.user.js');
const TEST_SCRIPT_PATH = path.join(__dirname, 'wh-test.user.js');

function stripUserscriptHeader(code) {
  return code.replace(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\s*/m, '');
}

async function run() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
  });

  const page = await browser.newPage();
  console.log('Navigálás:', TEST_URL);
  await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 60000 });

  // Cookie banner — próbáljuk bezárni
  try {
    await page.click('#didomi-notice-agree-button', { timeout: 3000 });
    console.log('Cookie elfogadva');
  } catch (_) {}

  await new Promise((r) => setTimeout(r, 2000));

  const before = await page.evaluate(() => ({
    hasLauncher: !!document.getElementById('wh-watcher-launcher'),
    hasTest: !!document.querySelector('[data-wh-watcher]'),
    title: document.title,
    href: location.href,
  }));
  console.log('ELŐTTE:', before);

  const testCode = stripUserscriptHeader(fs.readFileSync(TEST_SCRIPT_PATH, 'utf8'));
  await page.evaluate(testCode);
  await new Promise((r) => setTimeout(r, 1000));

  const afterTest = await page.evaluate(() => ({
    hasTestBtn: !!document.querySelector('button')?.textContent?.includes('WH TESZT'),
    whTest: window.__WH_TEST__,
    buttons: Array.from(document.querySelectorAll('button'))
      .filter((b) => (b.textContent || '').includes('WH'))
      .map((b) => b.textContent?.trim()),
  }));
  console.log('TESZT SCRIPT UTÁN:', afterTest);

  const mainCode = stripUserscriptHeader(fs.readFileSync(SCRIPT_PATH, 'utf8'));
  await page.evaluate(mainCode);
  await new Promise((r) => setTimeout(r, 3000));

  const afterMain = await page.evaluate(() => ({
    watcher: window.__WH_WATCHER__,
    launcher: !!document.getElementById('wh-watcher-launcher'),
    panel: !!document.getElementById('wh-watcher-panel'),
    launcherVisible: (() => {
      const el = document.getElementById('wh-watcher-launcher');
      if (!el) return false;
      const s = getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
    })(),
    ads: (() => {
      const sc = document.getElementById('__NEXT_DATA__');
      if (!sc) return 'no next data';
      try {
        const d = JSON.parse(sc.textContent);
        const sr = d.props?.pageProps?.searchResult || d.props?.pageProps?.initialSearchResult;
        return sr?.advertSummaryList?.advertSummary?.length ?? 0;
      } catch (e) {
        return 'parse err';
      }
    })(),
  }));
  console.log('FŐ SCRIPT UTÁN:', afterMain);

  const screenshot = path.join(__dirname, 'test-screenshot.png');
  await page.screenshot({ path: screenshot, fullPage: false });
  console.log('Screenshot:', screenshot);

  await page.close();
  browser.disconnect();
}

run().catch((e) => {
  console.error('HIBA:', e.message);
  process.exit(1);
});
