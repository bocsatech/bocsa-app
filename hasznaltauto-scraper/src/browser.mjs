import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import {
  collectListingLinksFromPage,
  collectSubListLinksFromPage,
} from "./links.mjs";
import { sleep, startChromeWithDebugging, waitForCdpReady } from "./chrome-launcher.mjs";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const DEFAULT_CDP_URL = "http://127.0.0.1:9222";
const MAX_SUB_LISTS = 20;
const CLOUDFLARE_WAIT_SECONDS = 20;
const CLOUDFLARE_MAX_ROUNDS = 15;

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
          "Nem sikerült csatlakozni a Chrome-hoz.",
          "Futtasd: npm run chrome",
          "Majd: npm start -- --connect",
        ].join("\n")
      );
    }
  }

  onProgress?.("Chrome automatikus indítása (debug port 9222)...");
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

export function getContextFromSession(session) {
  if (session.external) {
    const context = session.browser.contexts()[0];
    if (!context) throw new Error("Nincs megnyitott Chrome ablak.");
    return { context, external: true, browser: session.browser };
  }
  return { context: session.context, external: false, browser: null };
}

export async function closeSession(session) {
  if (session.external) {
    await session.browser?.close();
    return;
  }
  await session.context?.close();
}

export async function findHasznaltautoPage(context) {
  const pages = context.pages().filter((page) => !page.isClosed());
  for (const page of pages.reverse()) {
    const url = page.url();
    if (/hasznaltauto\.hu/i.test(url) && !/cloudflare/i.test(url)) {
      return page;
    }
  }
  return pages.at(-1) ?? null;
}

export async function waitForHasznaltautoPage(context, { onProgress, timeoutMs = 180000 } = {}) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const page = await findHasznaltautoPage(context);
    if (page) {
      const blocked = await isPageBlocked(page);
      if (!blocked) return page;
      await waitForHumanVerification(page, { onProgress, waitSeconds: CLOUDFLARE_WAIT_SECONDS, maxRounds: 1 });
      if (!(await isPageBlocked(page))) return page;
    } else {
      onProgress?.("Nyisd meg a hasznaltauto.hu Tesla oldalt a Chrome-ban...");
    }
    await sleep(3000);
  }

  throw new Error(
    "Nem találtunk betöltött hasznaltauto.hu lapot. Nyisd meg Chrome-ban, várd meg a listát, majd futtasd újra."
  );
}

export async function resolveWorkingPage(context, { connect = false, onProgress } = {}) {
  if (connect) {
    return waitForHasznaltautoPage(context, { onProgress });
  }

  const page = await findHasznaltautoPage(context);
  if (!page) {
    throw new Error("Nincs használható böngésző lap.");
  }
  return page;
}

export function isBlockedContent(title, html) {
  return (
    /cloudflare|pillanat|attention required|biztonsági ellenőrzés/i.test(title) ||
    /cf-challenge|cf-turnstile/i.test(html)
  );
}

export async function isPageBlocked(page) {
  const title = await page.title();
  const html = await page.content();
  return isBlockedContent(title, html);
}

export async function waitForHumanVerification(
  page,
  { onProgress, waitSeconds = CLOUDFLARE_WAIT_SECONDS, maxRounds = CLOUDFLARE_MAX_ROUNDS } = {}
) {
  for (let round = 1; round <= maxRounds; round += 1) {
    if (!(await isPageBlocked(page))) return;

    if (round === 1) {
      onProgress?.(
        `Cloudflare: igazold Chrome-ban, hogy ember vagy. Várakozás ${waitSeconds} másodperc...`
      );
    } else {
      onProgress?.(`Még Cloudflare van. Újabb ${waitSeconds} mp várakozás (${round}. kör)...`);
    }

    await sleep(waitSeconds * 1000);

    if (!(await isPageBlocked(page))) {
      onProgress?.("Cloudflare ellenőrzés kész, folytatás...");
      return;
    }
  }

  throw new Error(
    "Cloudflare ellenőrzés nem készült el időben. Végezd el Chrome-ban, majd futtasd újra: npm start -- --connect"
  );
}

export async function dismissCookieBanner(page) {
  const candidates = [
    page.getByRole("button", { name: /elfogad|hozzájárul|összes.*elfogad|accept/i }),
    page.locator("button, a").filter({ hasText: /elfogad|hozzájárul/i }),
  ];

  for (const locator of candidates) {
    try {
      const target = locator.first();
      if ((await target.count()) === 0 || !(await target.isVisible())) continue;
      await target.click({ timeout: 3000 });
      await page.waitForTimeout(800);
      return;
    } catch {
      /* next */
    }
  }
}

async function scrollPage(page) {
  for (let step = 0; step < 8; step += 1) {
    await page.evaluate((offset) => window.scrollTo(0, offset), step * 900);
    await page.waitForTimeout(1000);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

export async function waitForListingPage(page, timeoutMs = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const title = await page.title();
    const html = await page.content();
    if (!isBlockedContent(title, html) && (html.includes("hirdetesadatok") || html.includes("Alapadatok") || /<h1/i.test(html))) {
      return html;
    }
    await page.waitForTimeout(1500);
  }
  throw new Error("A hirdetés oldal nem töltődött be időben.");
}

export async function collectListingLinksWithRetry(page, baseUrl, { timeoutMs = 60000, onProgress } = {}) {
  const started = Date.now();
  let best = [];

  while (Date.now() - started < timeoutMs) {
    if (await isPageBlocked(page)) {
      await waitForHumanVerification(page, { onProgress });
      if (await isPageBlocked(page)) continue;
    }

    await dismissCookieBanner(page);
    await scrollPage(page);

    const links = await collectListingLinksFromPage(page, baseUrl);
    if (links.length > best.length) best = links;
    if (links.length > 0) return links;

    await page.waitForTimeout(2000);
  }

  return best;
}

export async function saveDebugHtml(page, label = "debug") {
  const dir = join(process.cwd(), "output");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${label}-oldal.html`);
  writeFileSync(path, await page.content(), "utf8");
  return path;
}

export async function collectListingLinksFromCurrentPage(page, listUrl, { onProgress, deep = false, debug = false } = {}) {
  const currentUrl = page.url();
  onProgress?.(`Megnyitott oldal használata: ${currentUrl}`);

  if (!/hasznaltauto\.hu/i.test(currentUrl)) {
    throw new Error("A megnyitott lap nem hasznaltauto.hu. Nyisd meg a Tesla listát Chrome-ban.");
  }

  if (await isPageBlocked(page)) {
    await waitForHumanVerification(page, { onProgress });
  }

  await page.waitForTimeout(2000);

  const baseUrl = listUrl || currentUrl;
  let listings = await collectListingLinksWithRetry(page, baseUrl, { timeoutMs: 60000, onProgress });

  if (listings.length > 0) {
    onProgress?.(`Hirdetések a megnyitott oldalon: ${listings.length}`);
    return { listings, listUrl: currentUrl };
  }

  if (!deep) {
    if (debug) {
      const path = await saveDebugHtml(page, "hiba");
      onProgress?.(`Hibakereső HTML mentve: ${path}`);
    }
    return { listings: [], listUrl: currentUrl };
  }

  const subLists = await collectSubListLinksFromPage(page, baseUrl);
  if (subLists.length === 0) {
    return { listings: [], listUrl: currentUrl };
  }

  onProgress?.(`Alkategóriák bejárása (--deep): ${subLists.length} db`);
  const all = new Set();

  for (let i = 0; i < Math.min(subLists.length, MAX_SUB_LISTS); i += 1) {
    const subUrl = subLists[i];
    onProgress?.(`[${i + 1}/${subLists.length}] ${subUrl}`);
    await page.goto(subUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(3000);
    const found = await collectListingLinksWithRetry(page, subUrl, { timeoutMs: 45000, onProgress });
    found.forEach((link) => all.add(link));
    onProgress?.(`  → ${found.length} hirdetés`);
  }

  return {
    listings: [...all].sort((a, b) => a.localeCompare(b, "hu")),
    listUrl: currentUrl,
  };
}

export async function extractListingCardsFromPage(page) {
  return page.evaluate(() => {
    const listingRe = /\/szemelyauto\/.+-\d{5,}$/;
    const seen = new Set();
    const cards = [];

    for (const anchor of document.querySelectorAll("a[href]")) {
      try {
        const url = new URL(anchor.href, window.location.href);
        if (!listingRe.test(url.pathname)) continue;

        const clean = `${url.origin}${url.pathname}`;
        if (seen.has(clean)) continue;
        seen.add(clean);

        const container =
          anchor.closest(
            'article,[class*="talalat"],[class*="listing"],[class*="hirdetes"],[class*="card"],li,tr'
          ) ||
          anchor.parentElement?.parentElement ||
          anchor.parentElement;

        const text = (container || anchor).innerText.replace(/\s+/g, " ").trim();
        const title = anchor.innerText.replace(/\s+/g, " ").trim();

        cards.push({ url: clean, text, title });
      } catch {
        /* skip */
      }
    }

    return cards;
  });
}

export async function revealPhoneNumber(page) {
  const revealSelectors = [
    page.getByRole("button", { name: /telefonszám.*felfed/i }),
    page.getByRole("link", { name: /telefonszám.*felfed/i }),
    page.getByText(/elsődleges telefonszám.*felfed/i),
    page.getByText(/telefonszám.*felfedése/i),
    page.locator("button, a").filter({ hasText: /felfed/i }),
  ];

  for (const locator of revealSelectors) {
    try {
      const target = locator.first();
      if ((await target.count()) === 0 || !(await target.isVisible())) continue;
      await target.click({ timeout: 5000 });
      await page.waitForTimeout(1200);
      break;
    } catch {
      /* try next */
    }
  }

  const fullText = await page.locator("body").innerText();
  const match = fullText.match(/(?:\+36|06)[\s\d/-]{7,16}\d/);
  return match ? match[0].replace(/\s+/g, " ").trim() : null;
}
