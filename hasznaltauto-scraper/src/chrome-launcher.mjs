import { spawn } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const DEFAULT_START_URL = "https://www.hasznaltauto.hu/szemelyauto/tesla";

const CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

export function findChromeExecutable() {
  return CHROME_PATHS.find((path) => existsSync(path)) ?? null;
}

export function getChromeProfileDir() {
  return join(process.cwd(), ".chrome-connect-profile");
}

export function startChromeWithDebugging(startUrl = DEFAULT_START_URL, port = 9222) {
  const chromePath = findChromeExecutable();
  if (!chromePath) {
    throw new Error(
      "Chrome nem található. Telepítsd a Google Chrome-ot, vagy indítsd kézzel a --remote-debugging-port=9222 kapcsolóval."
    );
  }

  const profileDir = getChromeProfileDir();
  mkdirSync(profileDir, { recursive: true });

  const child = spawn(
    chromePath,
    [`--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, startUrl],
    { detached: true, stdio: "ignore" }
  );
  child.unref();
  return { chromePath, profileDir, startUrl, port };
}

export async function waitForCdpReady(cdpUrl, { timeoutMs = 45000, onProgress } = {}) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${cdpUrl}/json/version`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return true;
    } catch {
      onProgress?.("Várakozás Chrome indítására...");
    }
    await sleep(1500);
  }

  return false;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
