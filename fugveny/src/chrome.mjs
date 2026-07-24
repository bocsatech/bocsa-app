import { spawn } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { chromium } from "playwright";

const CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

export const DEFAULT_CDP_URL = "http://127.0.0.1:9222";

export function findChromeExecutable() {
  return CHROME_PATHS.find((path) => existsSync(path)) ?? null;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function startChromeWithDebugging(startUrl, port = 9222, profileDir) {
  const chromePath = findChromeExecutable();
  if (!chromePath) {
    throw new Error("Google Chrome nem található. Telepítsd, vagy futtasd: npm start -- --headed");
  }

  mkdirSync(profileDir, { recursive: true });
  const child = spawn(
    chromePath,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      "--disable-blink-features=AutomationControlled",
      startUrl,
    ],
    { detached: true, stdio: "ignore" }
  );
  child.unref();
  return { chromePath, profileDir, port };
}

export async function waitForCdpReady(cdpUrl = DEFAULT_CDP_URL, { timeoutMs = 60000, onProgress } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${cdpUrl}/json/version`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return true;
    } catch {
      onProgress?.("Várakozás Chrome-ra (debug 9222)...");
    }
    await sleep(1500);
  }
  return false;
}

export async function connectOverCdp(cdpUrl = DEFAULT_CDP_URL) {
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0];
  if (!context) throw new Error("Nincs megnyitott Chrome ablak (CDP).");
  return { browser, context, external: true };
}
