import { spawn } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

export function findChromeExecutable() {
  return CHROME_PATHS.find((path) => existsSync(path)) ?? null;
}

function letoltesekRoot() {
  const home = homedir();
  const candidates = [join(home, "Letöltések"), join(home, "Downloads")];
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  const created = join(home, "Letöltések");
  mkdirSync(created, { recursive: true });
  return created;
}

/** Chrome profil is a Letöltések/mentesmarka alá kerül. */
export function getChromeProfileDir() {
  const dir = join(letoltesekRoot(), "mentesmarka", ".chrome-profile");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function startChromeWithDebugging(startUrl, port = 9223) {
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
