import { spawn, execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const DEFAULT_PORT = 9222;

const CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

export function findChromeExecutable() {
  return CHROME_PATHS.find((path) => existsSync(path)) ?? null;
}

export function getChromeProfileDir() {
  return join(process.cwd(), ".chrome-import-profile");
}

export function startChromeWithDebugging(startUrl, port = DEFAULT_PORT) {
  const chromePath = findChromeExecutable();
  if (!chromePath) {
    throw new Error(
      "Google Chrome nem található. Telepítsd a Chrome-ot, vagy indítsd kézzel: Google Chrome --remote-debugging-port=9222"
    );
  }

  const profileDir = getChromeProfileDir();
  mkdirSync(profileDir, { recursive: true });

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    startUrl,
  ];

  // macOS: `open -na` megbízhatóbban indítja a Chrome-ot (Dock, Gatekeeper).
  if (process.platform === "darwin" && chromePath.includes(".app/")) {
    const appName = /Chromium/i.test(chromePath) ? "Chromium" : "Google Chrome";
    const child = spawn("open", ["-na", appName, "--args", ...args], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return { chromePath, profileDir, startUrl, port, viaOpen: true };
  }

  const child = spawn(chromePath, args, { detached: true, stdio: "ignore" });
  child.unref();

  return { chromePath, profileDir, startUrl, port };
}

export async function isCdpReady(port = DEFAULT_PORT) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function waitForCdpReady(port = DEFAULT_PORT, { timeoutMs = 45000, onProgress } = {}) {
  const cdpUrl = `http://127.0.0.1:${port}`;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (await isCdpReady(port)) return cdpUrl;
    onProgress?.("Várakozás: Chrome indul…");
    await sleep(1500);
  }

  return null;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ensurePlaywrightBrowsers() {
  try {
    execSync("npx playwright install chromium", { stdio: "pipe", timeout: 120000 });
    return true;
  } catch {
    return false;
  }
}
