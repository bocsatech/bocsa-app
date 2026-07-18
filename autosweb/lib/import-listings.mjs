import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  collectListingLinksFromPage,
  extractListingCardsFromPage,
  isListPageUrl,
  isListingUrl,
  normalizeInputUrl,
} from "./links.mjs";
import { parseListingHtml } from "./parse-listing.mjs";
import { mapCardPreview, mapListingToForm } from "./map-to-form.mjs";
import { shortUrl } from "./url-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = join(__dirname, "..", ".import-profile");
const CDP_URL = "http://127.0.0.1:9222";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isContentReady(title, html, url) {
  if (!/hasznaltauto\.hu/i.test(url)) return false;
  if (/hirdetesadatok|Alapadatok/i.test(html)) return true;
  if (/talalatilista|találati|talalati/i.test(url + html)) return true;
  if (/\/szemelyauto\/.+-\d{5,}/i.test(url)) return true;
  return html.length > 25000 && !/Attention Required|biztonsági ellenőrzés/i.test(title + html);
}

function isBlocked(title, html, url) {
  if (isContentReady(title, html, url)) return false;
  return (
    /Attention Required|Egy pillanat/i.test(title) ||
    /challenges\.cloudflare\.com|cf-challenge-platform/i.test(html)
  );
}

async function waitForAccess(page, onProgress, maxSeconds = 90) {
  const deadline = Date.now() + maxSeconds * 1000;
  while (Date.now() < deadline) {
    const title = await page.title();
    const html = await page.content();
    const url = page.url();
    if (isContentReady(title, html, url)) return;
    if (isBlocked(title, html, url)) {
      onProgress?.("Cloudflare: oldd meg a böngészőben, majd folytatjuk…");
    }
    await sleep(1500);
  }
  throw new Error("Az oldal nem töltődött be időben. Oldd meg a Cloudflare ellenőrzést a böngészőben.");
}

async function openSession({ connect, startUrl, onProgress }) {
  if (connect) {
    try {
      const browser = await chromium.connectOverCDP(CDP_URL);
      const context = browser.contexts()[0];
      if (!context) throw new Error("Nincs Chrome ablak.");
      onProgress?.("Csatlakozva a megnyitott Chrome-hoz.");
      return { context, external: true, browser };
    } catch {
      onProgress?.("Chrome CDP (9222) nem elérhető — saját böngésző indul.");
    }
  }

  mkdirSync(PROFILE_DIR, { recursive: true });
  const common = {
    headless: false,
    locale: "hu-HU",
    viewport: { width: 1360, height: 900 },
    userAgent: USER_AGENT,
    args: ["--disable-blink-features=AutomationControlled"],
  };

  let context;
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, { ...common, channel: "chrome" });
  } catch {
    context = await chromium.launchPersistentContext(PROFILE_DIR, common);
  }

  onProgress?.("Böngésző megnyitva — szükség esetén jelöld meg a Cloudflare-t.");
  const page = context.pages()[0] ?? (await context.newPage());
  if (startUrl && (!page.url() || page.url() === "about:blank")) {
    await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  }
  return { context, external: false, browser: null };
}

async function getWorkingPage(context) {
  for (const page of context.pages()) {
    if (/hasznaltauto\.hu/i.test(page.url())) return page;
  }
  return context.pages()[0] ?? (await context.newPage());
}

async function waitForListingHtml(page) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const html = await page.content();
    const title = await page.title();
    if (isContentReady(title, html, page.url()) && /hirdetesadatok|Alapadatok/i.test(html)) {
      return html;
    }
    await sleep(1200);
  }
  throw new Error("Hirdetés oldal nem töltődött be.");
}

async function collectListingUrls(page, listUrl, limit, onProgress) {
  await waitForAccess(page, onProgress);
  const cards = await extractListingCardsFromPage(page);
  let urls = cards.map((c) => c.url);

  if (urls.length === 0) {
    urls = await collectListingLinksFromPage(page, listUrl || page.url());
  }

  const unique = [...new Set(urls)];
  onProgress?.(`Lista: ${unique.length} hirdetés link (max ${limit}).`);
  return { urls: unique.slice(0, limit), cards };
}

async function fetchListingForm(page, url, card, onProgress) {
  onProgress?.(`Részletek: ${shortUrl(url, 70)}`);
  if (page.url() !== url) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  }
  const html = await waitForListingHtml(page);
  const parsed = parseListingHtml(html, { url });
  const preview = mapCardPreview(card ?? { url }, parsed);
  return preview;
}

export async function importListings(inputUrl, options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 50);
  const onProgress = options.onProgress;
  const connect = options.connect !== false;
  const url = normalizeInputUrl(inputUrl);

  const session = await openSession({ connect, startUrl: url, onProgress });
  const items = [];
  const errors = [];

  try {
    const page = await getWorkingPage(session.context);

    if (isListingUrl(url)) {
      const item = await fetchListingForm(page, url, { url }, onProgress);
      items.push(item);
      return { listUrl: url, count: 1, items, errors };
    }

    if (!isListPageUrl(url)) {
      throw new Error("Adj meg hasznaltauto.hu lista URL-t vagy egy konkrét hirdetés linket.");
    }

    if (!/hasznaltauto\.hu/i.test(page.url()) || page.url() === "about:blank") {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    } else if (page.url() !== url) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    }

    const { urls, cards } = await collectListingUrls(page, url, limit, onProgress);
    if (urls.length === 0) {
      throw new Error("Nem találtunk hirdetést a listán. Görgess le, vagy oldd meg a Cloudflare-t.");
    }

    const cardByUrl = new Map(cards.map((c) => [c.url, c]));

    for (let i = 0; i < urls.length; i += 1) {
      const listingUrl = urls[i];
      try {
        onProgress?.(`[${i + 1}/${urls.length}] Import…`);
        const item = await fetchListingForm(page, listingUrl, cardByUrl.get(listingUrl), onProgress);
        items.push(item);
      } catch (error) {
        errors.push({ url: listingUrl, message: error.message ?? String(error) });
      }
      await sleep(300);
    }

    return { listUrl: url, count: items.length, items, errors };
  } finally {
    if (!session.external) {
      await session.context.close().catch(() => {});
      onProgress?.("Böngésző bezárva.");
    } else {
      onProgress?.("Chrome nyitva maradt.");
    }
  }
}

export async function importListingFromHtml(html, url) {
  const parsed = parseListingHtml(html, { url });
  return mapCardPreview({ url }, parsed);
}

export { mapListingToForm };
