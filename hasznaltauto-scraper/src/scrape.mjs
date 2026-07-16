import {
  collectAllListingLinks,
  launchBrowser,
  revealPhoneNumber,
  saveDebugHtml,
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

async function scrapeListPageOnce(url, { headless = true, profileDir, onProgress, debug = false } = {}) {
  const listUrl = normalizeInputUrl(url);
  const { context } = await launchBrowser({ profileDir, headless });
  const page = await preparePage(context);

  try {
    onProgress?.(headless ? "Oldal betöltése (háttérben)..." : "Oldal betöltése (látható böngésző)...");

    const listingLinks = await collectAllListingLinks(page, listUrl, { onProgress, debug });

    if (listingLinks.length === 0) {
      if (debug) await saveDebugHtml(page, "hiba");
      throw new Error(
        [
          "Nem találtunk hirdetés linket.",
          "1) Futtasd: npm start -- \"LINK\" --headed",
          "2) Várj, amíg betölt az oldal (Cloudflare ellenőrzés ha kell).",
          "3) Ellenőrizd: git pull origin main (verzió 1.1.0+)",
        ].join("\n")
      );
    }

    onProgress?.(`Összesen feldolgozandó hirdetés: ${listingLinks.length}`);

    const results = [];
    for (let i = 0; i < listingLinks.length; i += 1) {
      const listingUrl = listingLinks[i];
      onProgress?.(`Hirdetés [${i + 1}/${listingLinks.length}]`);
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

  const headless = options.headless !== false;

  try {
    return await scrapeListPageOnce(listUrl, { ...options, headless });
  } catch (error) {
    if (!headless) throw error;
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
