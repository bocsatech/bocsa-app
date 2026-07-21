import fs from 'fs';
import { execSync } from 'child_process';
import { chromium } from 'playwright';
import { getRoot } from './config.mjs';

function ensurePlaywrightBrowsers() {
  try {
    execSync('npx playwright install chromium', {
      cwd: getRoot(),
      stdio: 'inherit',
      timeout: 300000,
      env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ''}` },
    });
  } catch (err) {
    console.error('  ⚠ Playwright chromium telepítés sikertelen:', err.message);
  }
}

function unlockProfile(profileDir) {
  try {
    const lock = `${profileDir}/SingletonLock`;
    if (fs.existsSync(lock)) fs.unlinkSync(lock);
  } catch {
    /* ok */
  }
  try {
    // Kill leftover Chromium using this profile (mac/linux)
    execSync(
      `pkill -f "${profileDir.replace(/"/g, '')}" 2>/dev/null || true`,
      { stdio: 'ignore' },
    );
  } catch {
    /* ok */
  }
}

export async function launchBrowser(profileDir, { headless = true } = {}) {
  fs.mkdirSync(profileDir, { recursive: true });
  unlockProfile(profileDir);

  const baseOpts = {
    viewport: headless ? { width: 1280, height: 900 } : null,
    locale: 'de-AT',
    headless,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      ...(headless ? [] : ['--start-maximized', '--window-size=1280,900']),
    ],
  };

  const attempts = [
    { name: 'Google Chrome', opts: { ...baseOpts, channel: 'chrome' } },
    { name: 'Microsoft Edge', opts: { ...baseOpts, channel: 'msedge' } },
    { name: 'Chromium (Playwright)', opts: { ...baseOpts } },
  ];

  const errors = [];

  for (const attempt of attempts) {
    try {
      const context = await chromium.launchPersistentContext(profileDir, attempt.opts);
      const page = context.pages()[0] || (await context.newPage());
      if (!headless) {
        await page.bringToFront().catch(() => {});
      }
      console.log(`  ✓ Böngésző: ${attempt.name}`);
      return { context, browserName: attempt.name, page };
    } catch (err) {
      errors.push(`${attempt.name}: ${err.message}`);
    }
  }

  // Last resort: install chromium and retry once
  console.log('  → Playwright Chromium telepítése…');
  ensurePlaywrightBrowsers();
  unlockProfile(profileDir);

  try {
    const context = await chromium.launchPersistentContext(profileDir, baseOpts);
    const page = context.pages()[0] || (await context.newPage());
    if (!headless) await page.bringToFront().catch(() => {});
    console.log('  ✓ Böngésző: Chromium (újratelepítve)');
    return { context, browserName: 'Chromium', page };
  } catch (err) {
    errors.push(`Chromium retry: ${err.message}`);
  }

  const msg = [
    'Nem sikerült böngészőt indítani.',
    ...errors.map((e) => `  - ${e}`),
    '',
    'Próbáld Terminálban:',
    `  cd "$HOME/Downloads/Willhaben Agent"`,
    '  npx playwright install chromium',
    '  npm run login',
  ].join('\n');
  throw new Error(msg);
}
