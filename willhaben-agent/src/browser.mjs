import { chromium } from 'playwright';

export async function launchBrowser(profileDir, { headless = true } = {}) {
  const opts = { viewport: { width: 1280, height: 900 }, locale: 'de-AT', headless };
  try {
    const context = await chromium.launchPersistentContext(profileDir, { ...opts, channel: 'chrome' });
    return { context, browserName: 'Google Chrome' };
  } catch {
    const context = await chromium.launchPersistentContext(profileDir, opts);
    return { context, browserName: 'Chromium' };
  }
}
