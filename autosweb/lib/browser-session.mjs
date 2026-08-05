import { chromium } from "playwright";
import { mkdirSync } from "fs";
import {
  clearStaleProfileLocks,
  findChromeExecutable,
  getChromeProfileDir,
  isCdpReady,
  startChromeWithDebugging,
  waitForCdpReady,
} from "./chrome-launcher.mjs";

const CDP_PORT = 9222;

/** @type {{ context: import('playwright').BrowserContext, browser: import('playwright').Browser | null, mode: string } | null} */
let cachedSession = null;

function isContextAlive(session) {
  if (!session?.context) return false;
  try {
    const browser = session.context.browser();
    return !browser || browser.isConnected();
  } catch {
    return false;
  }
}

async function connectOverCdp(onProgress, port = CDP_PORT) {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context = browser.contexts()[0];
  if (!context) {
    throw new Error("Chrome csatlakozott, de nincs nyitott lap.");
  }
  onProgress?.("Csatlakozva meglévő Chrome-hoz (CDP).");
  return { context, browser, mode: "cdp" };
}

async function launchVisibleChrome(startUrl, onProgress) {
  const profileDir = getChromeProfileDir();
  mkdirSync(profileDir, { recursive: true });
  clearStaleProfileLocks(profileDir);

  onProgress?.("Chrome indítása (látható ablak, CDP nélkül)…");

  const baseOptions = {
    headless: false,
    viewport: null,
    ignoreDefaultArgs: ["--enable-automation"],
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-first-run",
      "--no-default-browser-check",
    ],
  };

  let context;
  const hasChrome = Boolean(findChromeExecutable());

  if (hasChrome) {
    try {
      context = await chromium.launchPersistentContext(profileDir, {
        ...baseOptions,
        channel: "chrome",
      });
      onProgress?.("Google Chrome megnyitva.");
    } catch (error) {
      onProgress?.(`Chrome csatorna hiba (${error.message}) — Playwright Chromium…`);
      context = await chromium.launchPersistentContext(profileDir, baseOptions);
      onProgress?.("Chromium megnyitva.");
    }
  } else {
    context = await chromium.launchPersistentContext(profileDir, baseOptions);
    onProgress?.("Chromium megnyitva (Google Chrome nem található).");
  }

  const browser = context.browser();
  let page = context.pages()[0] ?? (await context.newPage());

  if (startUrl && (!page.url() || page.url() === "about:blank")) {
    await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  }

  onProgress?.("Ha kell, oldd meg a Cloudflare-t a megnyílt ablakban.");
  return { context, browser, mode: "playwright" };
}

async function tryCdpLaunch(startUrl, onProgress) {
  if (await isCdpReady(CDP_PORT)) {
    return connectOverCdp(onProgress, CDP_PORT);
  }

  if (!findChromeExecutable()) return null;

  const profileDir = getChromeProfileDir();
  onProgress?.("CDP próba: Chrome debug mód (9222)…");
  startChromeWithDebugging(startUrl, CDP_PORT);

  const port = await waitForCdpReady(CDP_PORT, {
    profileDir,
    timeoutMs: 15000,
    onProgress,
  });

  if (!port) return null;
  onProgress?.(`CDP kész (${port}).`);
  return connectOverCdp(onProgress, port);
}

export async function acquireImportSession(startUrl, { onProgress, preferCdp = false } = {}) {
  if (isContextAlive(cachedSession)) {
    onProgress?.("Meglévő import böngésző — folytatás…");
    return cachedSession;
  }
  cachedSession = null;

  if (preferCdp) {
    try {
      const cdpSession = await tryCdpLaunch(startUrl, onProgress);
      if (cdpSession) {
        cachedSession = cdpSession;
        return cachedSession;
      }
    } catch (error) {
      onProgress?.(`CDP sikertelen: ${error.message}`);
    }
  }

  cachedSession = await launchVisibleChrome(startUrl, onProgress);
  return cachedSession;
}

export async function openChromeForImport(startUrl, { onProgress } = {}) {
  return acquireImportSession(startUrl, { onProgress, preferCdp: false });
}

/**
 * Mobil HA keresés: háttérben, ablak nélkül.
 * NE nyisson Chrome/Safari ablakot — a találatok az appban jelennek meg.
 */
export async function acquireHeadlessSearchSession({ onProgress } = {}) {
  onProgress?.("Használtautó keresés háttérben (ablak nélkül)…");

  const launchArgs = [
    "--disable-blink-features=AutomationControlled",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-dev-shm-usage",
  ];

  let browser;
  try {
    if (findChromeExecutable()) {
      browser = await chromium.launch({
        headless: true,
        channel: "chrome",
        args: launchArgs,
      });
    } else {
      browser = await chromium.launch({ headless: true, args: launchArgs });
    }
  } catch {
    browser = await chromium.launch({ headless: true, args: launchArgs });
  }

  const context = await browser.newContext({
    locale: "hu-HU",
    viewport: { width: 1400, height: 1000 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });

  return {
    context,
    browser,
    mode: "headless",
    async close() {
      try {
        await context.close();
      } catch {
        /* ignore */
      }
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    },
  };
}

export function releaseCachedSession() {
  cachedSession = null;
}
