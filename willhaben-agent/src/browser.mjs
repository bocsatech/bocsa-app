import fs from 'fs';
import path from 'path';
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

function sleepMs(ms) {
  try {
    execSync(`sleep ${Math.max(0.1, ms / 1000)}`);
  } catch {
    /* ok */
  }
}

function patchJsonFile(filePath, mutator) {
  try {
    if (!fs.existsSync(filePath)) return;
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    mutator(data);
    fs.writeFileSync(filePath, JSON.stringify(data));
  } catch {
    /* ignore corrupt prefs */
  }
}

/** Chromium „profil hiba / nem záródott be” javítás. */
export function repairProfile(profileDir) {
  if (!profileDir) return;
  fs.mkdirSync(profileDir, { recursive: true });

  // Lock fájlok
  for (const name of [
    'SingletonLock',
    'SingletonCookie',
    'SingletonSocket',
    'lockfile',
    'RunningChromeVersion',
  ]) {
    try {
      const lock = path.join(profileDir, name);
      if (fs.existsSync(lock)) fs.unlinkSync(lock);
    } catch {
      /* ok */
    }
  }

  // Default prefs: exited_cleanly
  const defDir = path.join(profileDir, 'Default');
  patchJsonFile(path.join(defDir, 'Preferences'), (data) => {
    data.profile = data.profile || {};
    data.profile.exit_type = 'Normal';
    data.profile.exited_cleanly = true;
    if (data.session) {
      data.session.restore_on_startup = 5; // open new tab
    }
  });

  patchJsonFile(path.join(profileDir, 'Local State'), (data) => {
    data.profile = data.profile || {};
    data.profile.exit_type = 'Normal';
    data.profile.exited_cleanly = true;
  });
}

/** Zárolt / beragadt Chromium folyamatok kiütése a profilról. */
export function unlockProfile(profileDir) {
  repairProfile(profileDir);

  const needle = String(profileDir || '').replace(/"/g, '');
  const cmds = [
    needle ? `pkill -f "${needle}" 2>/dev/null || true` : null,
    'pkill -f "ms-playwright.*chrome" 2>/dev/null || true',
    'pkill -f "playwright.*chromium" 2>/dev/null || true',
  ].filter(Boolean);

  for (const cmd of cmds) {
    try {
      execSync(cmd, { stdio: 'ignore' });
    } catch {
      /* ok */
    }
  }

  sleepMs(700);
  repairProfile(profileDir);
}

export async function closeBrowserCleanly(context) {
  if (!context) return;
  try {
    for (const p of context.pages()) {
      await p.close().catch(() => {});
    }
  } catch {
    /* ok */
  }
  await context.close().catch(() => {});
  sleepMs(400);
}

/**
 * System Chrome (channel:'chrome') often crashes with Playwright persistent profiles on Mac.
 * Prefer bundled Playwright Chromium for headed login/sync.
 */
export async function launchBrowser(profileDir, { headless = true } = {}) {
  fs.mkdirSync(profileDir, { recursive: true });
  unlockProfile(profileDir);

  const baseOpts = {
    viewport: { width: 1280, height: 900 },
    locale: 'de-AT',
    headless,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-session-crashed-bubble',
      '--hide-crash-restore-bubble',
      '--disable-features=InfiniteSessionRestore,TranslateUI',
      '--noerrdialogs',
      '--disable-infobars',
      ...(headless ? [] : ['--window-size=1280,900']),
    ],
  };

  // Playwright Chromium FIRST — system Chrome crashes ("Page crashed")
  const attempts = [
    { name: 'Chromium (Playwright)', opts: { ...baseOpts } },
    { name: 'Google Chrome', opts: { ...baseOpts, channel: 'chrome' } },
    { name: 'Microsoft Edge', opts: { ...baseOpts, channel: 'msedge' } },
  ];

  const errors = [];

  for (const attempt of attempts) {
    try {
      unlockProfile(profileDir);
      const context = await chromium.launchPersistentContext(profileDir, attempt.opts);
      context.on('page', (p) => {
        p.on('crash', () => console.error('  ⚠ Oldal crash — újrapróbálás következhet'));
      });
      const page = context.pages()[0] || (await context.newPage());
      if (!headless) await page.bringToFront().catch(() => {});
      // Crash-restore / profil dialógus elutasítása
      await page.keyboard.press('Escape').catch(() => {});
      console.log(`  ✓ Böngésző: ${attempt.name}`);
      return { context, browserName: attempt.name, page };
    } catch (err) {
      errors.push(`${attempt.name}: ${err.message}`);
      unlockProfile(profileDir);
    }
  }

  console.log('  → Playwright Chromium telepítése…');
  ensurePlaywrightBrowsers();
  unlockProfile(profileDir);

  try {
    const context = await chromium.launchPersistentContext(profileDir, baseOpts);
    const page = context.pages()[0] || (await context.newPage());
    if (!headless) await page.bringToFront().catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    console.log('  ✓ Böngésző: Chromium (újratelepítve)');
    return { context, browserName: 'Chromium', page };
  } catch (err) {
    errors.push(`Chromium retry: ${err.message}`);
  }

  throw new Error([
    'Nem sikerült böngészőt indítani (profil zárolva / sérült).',
    ...errors.map((e) => `  - ${e}`),
    '',
    'Próbáld:',
    '  wh-agent stop',
    '  cd "$HOME/Downloads/Willhaben Agent" && npx playwright install chromium',
    '  npm run login',
  ].join('\n'));
}
