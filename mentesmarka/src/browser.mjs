import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";
import { startChromeWithDebugging, waitForCdpReady } from "./chrome-launcher.mjs";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const DEFAULT_CDP_URL = "http://127.0.0.1:9223";

export async function launchBrowser({ profileDir, headless = true } = {}) {
  const resolvedProfile = profileDir ?? join(process.cwd(), ".browser-profile");
  mkdirSync(resolvedProfile, { recursive: true });

  const common = {
    headless,
    locale: "hu-HU",
    viewport: { width: 1360, height: 900 },
    userAgent: USER_AGENT,
    args: ["--disable-blink-features=AutomationControlled"],
  };

  try {
    const context = await chromium.launchPersistentContext(resolvedProfile, {
      ...common,
      channel: "chrome",
    });
    return { context, browserName: "Google Chrome", external: false };
  } catch {
    const context = await chromium.launchPersistentContext(resolvedProfile, common);
    return { context, browserName: "Chromium (Playwright)", external: false };
  }
}

async function tryConnectCdp(cdpUrl) {
  const browser = await chromium.connectOverCDP(cdpUrl);
  return { browser, browserName: "Megnyitott Chrome", external: true };
}

export async function connectToOpenBrowser(
  cdpUrl = DEFAULT_CDP_URL,
  { autoStart = true, startUrl, onProgress } = {}
) {
  try {
    return await tryConnectCdp(cdpUrl);
  } catch {
    if (!autoStart) {
      throw new Error(
        [
          "Nem sikerült csatlakozni a mentesmarka Chrome-hoz (port 9223).",
          "1. terminál: cd mentesmarka && npm run chrome",
          "Töltsd be az űrlapot ABBAN az ablakban, majd: npm run mentesmarka",
          "",
          "Ha a hasznaltauto-scraper Chrome fut (9222), az más — ne keverd össze.",
        ].join("\n")
      );
    }
  }

  onProgress?.("Chrome automatikus indítása (port 9222)...");
  startChromeWithDebugging(startUrl);

  const ready = await waitForCdpReady(cdpUrl, { onProgress });
  if (!ready) {
    throw new Error("Chrome nem indult el időben. Próbáld: npm run chrome");
  }

  try {
    return await tryConnectCdp(cdpUrl);
  } catch (error) {
    throw new Error(
      `Chrome elindult, de a csatlakozás nem sikerült: ${error.message ?? error}`
    );
  }
}
