import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import {
  collectListingLinksFromPage,
  collectSubListLinksFromPage,
} from "./links.mjs";
import { sleep, startChromeWithDebugging, waitForCdpReady } from "./chrome-launcher.mjs";
import { shortUrl } from "./url-utils.mjs";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const DEFAULT_CDP_URL = "http://127.0.0.1:9222";
const MAX_SUB_LISTS = 20;
const CLOUDFLARE_WAIT_SECONDS = 20;
const CLOUDFLARE_MAX_ROUNDS = 3;
const CLOUDFLARE_POLL_MS = 500;

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
  if (pages.length === 0) return null;

  const candidates = [];
  for (const page of pages) {
    const url = page.url();
    if (!/hasznaltauto\.hu/i.test(url) || /cloudflare/i.test(url)) continue;

    let score = 0;
    if (/talalatilista/i.test(url)) score += 100;
    if (/\/szemelyauto\//i.test(url)) score += 20;

    try {
      const signals = await page.evaluate(() => ({
        rows: document.querySelectorAll(".talalati-sor, .row.talalati-sor").length,
        links: document.querySelectorAll("a[href*='/szemelyauto/']").length,
      }));
      score += signals.rows * 5 + Math.min(signals.links, 50);
    } catch {
      /* lap még tölt */
    }

    candidates.push({ page, score, url });
  }

  if (candidates.length === 0) return pages.at(-1) ?? null;

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].page;
}

export async function waitForHasznaltautoPage(context, { onProgress, timeoutMs = 120000 } = {}) {
  const started = Date.now();
  let notified = false;

  while (Date.now() - started < timeoutMs) {
    const page = await findHasznaltautoPage(context);
    if (!page) {
      onProgress?.("Nyisd meg a hasznaltauto.hu Tesla oldalt a Chrome-ban...");
      await sleep(1000);
      continue;
    }

    if (await isPageAccessGranted(page)) {
      if (notified) onProgress?.("Bejutás OK, folytatás...");
      return page;
    }

    if (!notified) {
      onProgress?.("Cloudflare: igazold Chrome-ban, hogy ember vagy...");
      notified = true;
    }

    await sleep(CLOUDFLARE_POLL_MS);
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

export function isHasznaltautoContentReady(title, html, url = "") {
  if (!/hasznaltauto\.hu/i.test(url)) return false;

  if (/szemelyauto\/.+-\d{5,}/i.test(html)) return true;
  if (/hirdetesadatok|Alapadatok/i.test(html)) return true;
  if (/találati|talalati|talalatilista/i.test(url) || /talalatilista/i.test(html)) return true;
  if (
    /\/szemelyauto\//i.test(url) &&
    html.length > 25000 &&
    !/biztonsági ellenőrzés végrehajtása/i.test(html)
  ) {
    return true;
  }

  return false;
}

export function isBlockedContent(title, html, url = "") {
  if (isHasznaltautoContentReady(title, html, url)) return false;

  return (
    /^(Egy pillanat|Attention Required)/i.test(title.trim()) ||
    /biztonsági ellenőrzés végrehajtása/i.test(html) ||
    (/challenges\.cloudflare\.com|cf-challenge-platform/i.test(html) && html.length < 20000)
  );
}

export async function isPageAccessGranted(page) {
  const title = await page.title();
  const html = await page.content();
  const url = page.url();
  return isHasznaltautoContentReady(title, html, url);
}

export async function isPageBlocked(page) {
  return !(await isPageAccessGranted(page));
}

export async function waitForHumanVerification(
  page,
  {
    onProgress,
    waitSeconds = CLOUDFLARE_WAIT_SECONDS,
    maxRounds = CLOUDFLARE_MAX_ROUNDS,
    pollIntervalMs = CLOUDFLARE_POLL_MS,
  } = {}
) {
  if (await isPageAccessGranted(page)) return;

  for (let round = 1; round <= maxRounds; round += 1) {
    if (await isPageAccessGranted(page)) {
      onProgress?.("Bejutás OK, folytatás...");
      return;
    }

    if (round === 1) {
      onProgress?.(`Cloudflare: igazold Chrome-ban (max ${waitSeconds} mp)...`);
    }

    const roundDeadline = Date.now() + waitSeconds * 1000;

    while (Date.now() < roundDeadline) {
      await sleep(pollIntervalMs);
      if (await isPageAccessGranted(page)) {
        onProgress?.("Bejutás OK, folytatás...");
        return;
      }
    }
  }

  if (await isPageAccessGranted(page)) return;

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

async function scrollPage(page, { steps = 6 } = {}) {
  for (let step = 0; step < steps; step += 1) {
    await page.evaluate((offset) => window.scrollTo(0, offset), step * 900);
    await page.waitForTimeout(500);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
}

export async function preparePageForScraping(page, { onProgress } = {}) {
  onProgress?.("Oldal előkészítése (süti, görgetés)...");
  await dismissCookieBanner(page);
  await scrollPage(page, { steps: 8 });
}

export async function waitForListingPage(page, timeoutMs = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const title = await page.title();
    const html = await page.content();
    const url = page.url();
    if (isHasznaltautoContentReady(title, html, url) || (!isBlockedContent(title, html, url) && (html.includes("hirdetesadatok") || html.includes("Alapadatok") || /<h1/i.test(html)))) {
      return html;
    }
    await page.waitForTimeout(1500);
  }
  throw new Error("A hirdetés oldal nem töltődött be időben.");
}

export async function collectListingLinksWithRetry(page, baseUrl, { timeoutMs = 30000, onProgress } = {}) {
  const started = Date.now();
  let best = [];

  while (Date.now() - started < timeoutMs) {
    const links = await collectListingLinksFromPage(page, baseUrl);
    if (links.length > best.length) best = links;
    if (links.length > 0) return links;

    if (!(await isPageAccessGranted(page))) {
      await waitForHumanVerification(page, { onProgress, maxRounds: 1 });
      continue;
    }

    await dismissCookieBanner(page);
    await scrollPage(page);
    await page.waitForTimeout(800);
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

export async function collectListingLinksFromCurrentPage(
  page,
  listUrl,
  { onProgress, deep = false, debug = false, manualReady = false } = {}
) {
  const currentUrl = page.url();
  onProgress?.(`Lista beolvasása: ${shortUrl(currentUrl)}`);

  if (!/hasznaltauto\.hu/i.test(currentUrl)) {
    throw new Error("A megnyitott lap nem hasznaltauto.hu.");
  }

  const baseUrl = listUrl || currentUrl;
  let listings = manualReady
    ? await collectListingLinksFromPage(page, baseUrl)
    : await collectListingLinksWithRetry(page, baseUrl, { timeoutMs: 15000, onProgress });

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
    const listingRe = /\/szemelyauto\/[^?#]+-\d{5,}/i;
    const seen = new Set();
    const cards = [];

    const addCard = (url, container, title) => {
      try {
        const absolute = new URL(url, window.location.href);
        if (!listingRe.test(absolute.pathname)) return;
        const clean = `${absolute.origin}${absolute.pathname}`;
        if (seen.has(clean)) return;
        seen.add(clean);
        const text = (container || document.body).innerText?.replace(/\s+/g, " ").trim() ?? "";
        cards.push({ url: clean, text, title: title?.trim() || "" });
      } catch {
        /* skip */
      }
    };

    for (const row of document.querySelectorAll(".row.talalati-sor, .talalati-sor")) {
      const anchor =
        row.querySelector(".cim-kontener h3 a") ||
        row.querySelector("h3 a[href*='/szemelyauto/']") ||
        row.querySelector("a[href*='/szemelyauto/']");
      if (!anchor) continue;
      addCard(anchor.href, row, anchor.innerText);
    }

    for (const anchor of document.querySelectorAll("a[href]")) {
      const container =
        anchor.closest(
          'article,[class*="talalat"],[class*="listing"],[class*="hirdetes"],[class*="card"],[class*="row"],li,tr,div'
        ) || anchor.parentElement;
      addCard(anchor.href, container, anchor.innerText);
    }

    for (const node of document.querySelectorAll("[data-href],[data-url]")) {
      addCard(node.getAttribute("data-href") || node.getAttribute("data-url"), node.parentElement, node.textContent);
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
