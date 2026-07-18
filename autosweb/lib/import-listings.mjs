import { chromium } from "playwright";
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
import {
  findChromeExecutable,
  getChromeProfileDir,
  isCdpReady,
  startChromeWithDebugging,
  waitForCdpReady,
} from "./chrome-launcher.mjs";

const CDP_PORT = 9222;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasListPageContent(html) {
  return /talalati-sor|talalatisor-infokontener|class="row talalati-sor"/i.test(html);
}

function isContentReady(title, html, url) {
  if (!/hasznaltauto\.hu/i.test(url)) return false;
  if (/Attention Required|biztonsági ellenőrzés|Egy pillanat/i.test(title + html)) return false;
  if (/challenges\.cloudflare\.com|cf-challenge-platform|cf-turnstile/i.test(html)) return false;
  if (/hirdetesadatok|Alapadatok/i.test(html)) return true;
  if (/\/szemelyauto\/.+-\d{5,}/i.test(url) && html.length > 12000) return true;
  if (/talalatilista/i.test(url) && hasListPageContent(html)) return true;
  if (/talalatilista/i.test(url)) return false;
  return html.length > 25000 && !/Attention Required|biztonsági ellenőrzés/i.test(title + html);
}

function isBlocked(title, html, url) {
  if (isContentReady(title, html, url)) return false;
  return (
    /Attention Required|Egy pillanat/i.test(title) ||
    /challenges\.cloudflare\.com|cf-challenge-platform/i.test(html)
  );
}

async function waitForAccess(page, onProgress, maxSeconds = 120) {
  const deadline = Date.now() + maxSeconds * 1000;
  while (Date.now() < deadline) {
    const title = await page.title();
    const html = await page.content();
    const url = page.url();
    if (isContentReady(title, html, url)) return;
    if (isBlocked(title, html, url)) {
      onProgress?.("Cloudflare: jelöld meg a megnyílt Chrome ablakban, majd várunk…");
    }
    await sleep(2000);
  }
  throw new Error(
    "Az oldal nem töltődött be időben. A Chrome ablakban oldd meg a Cloudflare-t, majd indítsd újra az importot."
  );
}

export async function openChromeForImport(startUrl, { onProgress } = {}) {
  const url = normalizeInputUrl(startUrl);

  if (await isCdpReady(CDP_PORT)) {
    onProgress?.("Meglévő Chrome (9222) — csatlakozás…");
    return connectChrome(onProgress, CDP_PORT);
  }

  const chromePath = findChromeExecutable();
  if (!chromePath) {
    throw new Error(
      "Google Chrome nem található. Telepítsd a Chrome-ot Mac-re, majd próbáld újra."
    );
  }

  const profileDir = getChromeProfileDir();
  onProgress?.("Chrome indítása (külön import profil, CDP 9222)…");
  startChromeWithDebugging(url, CDP_PORT);

  const port = await waitForCdpReady(CDP_PORT, {
    profileDir,
    timeoutMs: 90000,
    onProgress,
  });

  if (!port) {
    throw new Error(
      "Chrome CDP nem elérhető 90 mp alatt. Zárj be minden Chrome-ot, kattints újra a „Chrome megnyitása” gombra. " +
        "Ha megjelenik a Chrome, de ez a hiba marad: a sima Chrome nem elég — az importnak külön debug mód kell."
    );
  }

  onProgress?.(`Chrome CDP kész (${port}) — ha kell, oldd meg a Cloudflare-t abban az ablakban.`);
  return connectChrome(onProgress, port);
}

async function connectChrome(onProgress, port = CDP_PORT) {
  const CDP_URL = `http://127.0.0.1:${port}`;
  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  if (!context) {
    throw new Error("Chrome csatlakozott, de nincs nyitott lap.");
  }
  onProgress?.("Playwright csatlakozva a Chrome-hoz.");
  return { context, browser, external: true };
}

async function openSession({ startUrl, onProgress }) {
  try {
    return await openChromeForImport(startUrl, { onProgress });
  } catch (error) {
    onProgress?.(`Chrome indítás sikertelen: ${error.message}`);
    throw error;
  }
}

async function getWorkingPage(context, startUrl) {
  for (const page of context.pages()) {
    if (/hasznaltauto\.hu/i.test(page.url())) return page;
  }

  const page = context.pages()[0] ?? (await context.newPage());
  if (startUrl && (!page.url() || page.url() === "about:blank")) {
    await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  }
  return page;
}

async function waitForListingHtml(page) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const html = await page.content();
    const title = await page.title();
    if (isContentReady(title, html, page.url()) && /hirdetesadatok|Alapadatok/i.test(html)) {
      return html;
    }
    await sleep(1500);
  }
  throw new Error("Hirdetés oldal nem töltődött be a Chrome-ban.");
}

async function scrollListPage(page, onProgress) {
  onProgress?.("Lista görgetése (lazy load)…");
  for (let i = 0; i < 6; i += 1) {
    await page.evaluate(() => window.scrollBy(0, Math.max(window.innerHeight * 1.5, 600)));
    await sleep(700);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
}

async function collectListingUrls(page, listUrl, limit, onProgress) {
  await waitForAccess(page, onProgress);
  await scrollListPage(page, onProgress);

  let cards = await extractListingCardsFromPage(page);
  let urls = cards.map((c) => c.url);

  if (urls.length === 0) {
    urls = await collectListingLinksFromPage(page, listUrl || page.url());
  }

  if (urls.length === 0) {
    onProgress?.("Még nincs link — várunk, hátha betölt a lista…");
    await sleep(5000);
    await scrollListPage(page, onProgress);
    cards = await extractListingCardsFromPage(page);
    urls = cards.map((c) => c.url);
    if (urls.length === 0) {
      urls = await collectListingLinksFromPage(page, listUrl || page.url());
    }
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
  return mapCardPreview(card ?? { url }, parsed);
}

export async function importListings(inputUrl, options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 50);
  const onProgress = options.onProgress;
  const url = normalizeInputUrl(inputUrl);

  const session = await openSession({ startUrl: url, onProgress });
  const items = [];
  const errors = [];

  try {
    const page = await getWorkingPage(session.context, url);

    if (isListingUrl(url)) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 }).catch(() => {});
      await waitForAccess(page, onProgress);
      const item = await fetchListingForm(page, url, { url }, onProgress);
      items.push(item);
      return { listUrl: url, count: 1, items, errors };
    }

    if (!isListPageUrl(url)) {
      throw new Error("Adj meg hasznaltauto.hu lista URL-t vagy egy konkrét hirdetés linket.");
    }

    if (!/hasznaltauto\.hu/i.test(page.url()) || page.url() === "about:blank") {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    } else if (!page.url().startsWith(url.split("?")[0].slice(0, 40))) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    }

    const { urls, cards } = await collectListingUrls(page, url, limit, onProgress);
    if (urls.length === 0) {
      const title = await page.title().catch(() => "");
      const onCf = isBlocked(title, await page.content().catch(() => ""), page.url());
      throw new Error(
        onCf
          ? "Cloudflare blokkolja az oldalt. A Chrome ablakban jelöld meg a pipát, várj amíg megjelennek a hirdetések, majd indítsd újra az importot."
          : "Nem találtunk hirdetést a listán. A Chrome ablakban görgess le, ellenőrizd hogy betöltött-e a találati lista, majd indítsd újra az importot."
      );
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
      await sleep(400);
    }

    return { listUrl: url, count: items.length, items, errors };
  } finally {
    onProgress?.("Chrome nyitva maradt — bezárhatod kézzel, ha kész.");
  }
}

export async function importListingFromHtml(html, url) {
  const parsed = parseListingHtml(html, { url });
  return mapCardPreview({ url }, parsed);
}

export { mapListingToForm };
