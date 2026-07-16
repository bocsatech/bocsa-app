import {
  collectListingLinksWithRetry,
  launchBrowser,
  revealPhoneNumber,
  waitForListingPage,
} from "./browser.mjs";
import { isListPageUrl } from "./links.mjs";
import { formatListResultText, formatSingleResultText, parseListingHtml } from "./parse.mjs";

const HASZNALTAUTO_RE = /^https?:\/\/(www\.)?hasznaltauto\.hu\//i;

export function normalizeInputUrl(input) {
  const url = String(input ?? "").trim();
  if (!url) throw new Error("Üres link.");
  if (!HASZNALTAUTO_RE.test(url)) {
    throw new Error("Csak hasznaltauto.hu link támogatott.");
  }
  return url;
}

async function preparePage(context) {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  return page;
}

export async function scrapeListingFromPage(page, listingUrl) {
  await page.goto(listingUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  const html = await waitForListingPage(page);
  const telefonszam = await revealPhoneNumber(page);
  const parsed = parseListingHtml(html, { url: listingUrl, phone: telefonszam });
  return {
    ...parsed,
    text: formatSingleResultText(parsed),
  };
}

export async function scrapeListing(url, { headless = true, profileDir } = {}) {
  const listingUrl = normalizeInputUrl(url);
  const { context } = await launchBrowser({ profileDir, headless });
  const page = await preparePage(context);

  try {
    return await scrapeListingFromPage(page, listingUrl);
  } finally {
    await context.close();
  }
}

async function scrapeListPageOnce(url, { headless = true, profileDir, onProgress } = {}) {
  const listUrl = normalizeInputUrl(url);
  const { context } = await launchBrowser({ profileDir, headless });
  const page = await preparePage(context);

  try {
    onProgress?.(headless ? "Oldal betöltése (háttérben)..." : "Oldal betöltése (látható böngésző)...");

    await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(3000);

    const listingLinks = await collectListingLinksWithRetry(page, listUrl);

    if (listingLinks.length === 0) {
      throw new Error(
        "Nem találtunk hirdetés linket. Futtasd így: npm start -- \"LINK\" --headed"
      );
    }

    onProgress?.(`Talált hirdetések: ${listingLinks.length}`);

    const results = [];
    for (let i = 0; i < listingLinks.length; i += 1) {
      const listingUrl = listingLinks[i];
      onProgress?.(`[${i + 1}/${listingLinks.length}] ${listingUrl}`);
      try {
        const item = await scrapeListingFromPage(page, listingUrl);
        results.push(item);
      } catch (error) {
        results.push({
          url: listingUrl,
          jarmuTipus: null,
          ar: null,
          evjarat: null,
          km: null,
          telefonszam: null,
          cim: null,
          hiba: error.message ?? String(error),
          text: `HIBA: ${listingUrl}\n${error.message ?? error}`,
        });
      }
    }

    const text = formatListResultText({
      listUrl,
      results,
    });

    return {
      listUrl,
      listingLinks,
      results,
      text,
    };
  } finally {
    await context.close();
  }
}

export async function scrapeListPage(url, options = {}) {
  const listUrl = normalizeInputUrl(url);
  if (!isListPageUrl(listUrl)) {
    throw new Error("A megadott link nem lista oldal, hanem egy konkrét hirdetés.");
  }

  try {
    return await scrapeListPageOnce(listUrl, options);
  } catch (error) {
    if (options.headless === false) throw error;

    options.onProgress?.("Nem sikerült háttérben. Újrapróbálás látható böngészővel...");
    return scrapeListPageOnce(listUrl, { ...options, headless: false });
  }
}

export async function scrapeUrl(url, options = {}) {
  const normalized = normalizeInputUrl(url);
  if (isListPageUrl(normalized)) {
    return scrapeListPage(normalized, options);
  }
  return scrapeListing(normalized, options);
}
