import { chromium } from 'playwright';

export async function launchBrowser(profileDir, { headless = true } = {}) {
  const opts = {
    viewport: { width: 1280, height: 900 },
    locale: 'de-AT',
    headless,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    args: ['--disable-blink-features=AutomationControlled'],
  };
  try {
    const context = await chromium.launchPersistentContext(profileDir, { ...opts, channel: 'chrome' });
    return { context, browserName: 'Google Chrome' };
  } catch {
    const context = await chromium.launchPersistentContext(profileDir, opts);
    return { context, browserName: 'Chromium' };
  }
}
