import { chromium } from 'playwright';

const BASE_OPTIONS = {
  viewport: { width: 1280, height: 900 },
  locale: 'de-AT',
};

export async function launchBrowser(profileDir, { headless = false } = {}) {
  const opts = { ...BASE_OPTIONS, headless };

  try {
    const context = await chromium.launchPersistentContext(profileDir, {
      ...opts,
      channel: 'chrome',
    });
    return { context, browserName: 'Google Chrome' };
  } catch {
    /* Chromium fallback */
  }

  const context = await chromium.launchPersistentContext(profileDir, opts);
  return { context, browserName: 'Chromium (Playwright)' };
}
