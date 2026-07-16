import {
  closeSession,
  collectListingLinksFromCurrentPage,
  connectToOpenBrowser,
  DEFAULT_CDP_URL,
  extractListingCardsFromPage,
  fetchListingPhone,
  findHasznaltautoPage,
  getContextFromSession,
  launchBrowser,
  preparePageForScraping,
  resolveWorkingPage,
  saveDebugHtml,
  tryRevealPhonesOnListRows,
} from "./browser.mjs";
import { isListPageUrl, isListingUrl } from "./links.mjs";
import { formatListResultText, formatSingleResultText, parseListingCard } from "./parse.mjs";
import { shortUrl } from "./url-utils.mjs";

const HASZNALTAUTO_RE = /^https?:\/\/(www\.)?hasznaltauto\.hu\//i;

export function normalizeInputUrl(input) {
  const url = String(input ?? "").trim();
  if (!url) return null;
  if (!HASZNALTAUTO_RE.test(url)) {
    throw new Error("Csak hasznaltauto.hu link támogatott.");
  }
  return url;
}

async function openSession({ connect = false, headless = true, profileDir, startUrl, onProgress } = {}) {
  if (connect) {
    return connectToOpenBrowser(DEFAULT_CDP_URL, { autoStart: true, startUrl, onProgress });
  }
  return launchBrowser({ profileDir, headless });
}

async function enrichResultsWithPhones(page, results, { onProgress, listUrl } = {}) {
  onProgress?.("Telefonszámok: felfedés gombra kattintás...");

  const listPhones = await tryRevealPhonesOnListRows(page);
  let fromList = 0;

  for (const item of results) {
    const listed = listPhones.get(item.url);
    if (listed) {
      item.telefonszam = listed;
      fromList += 1;
    }
  }

  if (fromList > 0) {
    onProgress?.(`Lista sorokból: ${fromList} telefonszám`);
  }

  const missing = results.filter((item) => !item.telefonszam);
  if (missing.length === 0) return results;

  onProgress?.(`Hirdetés oldalak megnyitása: ${missing.length} db (felfedés gomb)`);

  for (let i = 0; i < missing.length; i += 1) {
    const item = missing[i];
    onProgress?.(`[${i + 1}/${missing.length}] ${shortUrl(item.url)}`);
    try {
      item.telefonszam = await fetchListingPhone(page, item.url, { onProgress });
    } catch (error) {
      onProgress?.(`  → hiba: ${error.message ?? error}`);
    }
    await page.waitForTimeout(400);
  }

  if (listUrl) {
    try {
      await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
    } catch {
      /* nem kritikus */
    }
  }

  return results;
}

async function scrapeCardsFromPage(
  page,
  listUrl,
  { onProgress, deep = false, debug = false, manualReady = false, fetchPhones = true } = {}
) {
  const currentUrl = page.url();
  onProgress?.(`Megnyitott oldal: ${shortUrl(currentUrl)}`);

  if (!/hasznaltauto\.hu/i.test(currentUrl)) {
    throw new Error("A megnyitott lap nem hasznaltauto.hu.");
  }

  if (manualReady) {
    await preparePageForScraping(page, { onProgress });
  }

  let cards = await extractListingCardsFromPage(page);

  if (cards.length === 0) {
    const { listings } = await collectListingLinksFromCurrentPage(page, listUrl, {
      onProgress,
      deep,
      debug,
      manualReady: true,
    });
    cards = listings.map((url) => ({ url, text: "", title: "" }));
  }

  if (cards.length === 0) {
    const debugPath = await saveDebugHtml(page, "hiba");
    onProgress?.(`Hibakereső HTML mentve: ${debugPath}`);
    throw new Error(
      [
        "Nem találtunk hirdetést a megnyitott oldalon.",
        "Ellenőrizd Chrome-ban: látod a hirdetéseket? (nem Cloudflare képernyő?)",
        "Görgess le a listán, majd futtasd újra: npm start",
        `Részletek: ${debugPath}`,
      ].join("\n")
    );
  }

  onProgress?.(`Kinyert hirdetések: ${cards.length} db`);

  let results = cards.map((card) => parseListingCard(card));

  if (fetchPhones) {
    results = await enrichResultsWithPhones(page, results, { onProgress, listUrl: currentUrl });
  }

  const text = formatListResultText({ listUrl: currentUrl, results });

  return {
    listUrl: currentUrl,
    listingLinks: cards.map((c) => c.url),
    results,
    text,
  };
}

async function scrapeListPageOnce(url, options = {}) {
  const {
    connect = false,
    headless = true,
    profileDir,
    onProgress,
    debug = false,
    deep = false,
    manualReady = false,
    fetchPhones = true,
  } = options;

  const listUrl = url ? normalizeInputUrl(url) : null;
  if (listUrl && !isListPageUrl(listUrl)) {
    throw new Error("A megadott link nem lista oldal, hanem egy konkrét hirdetés.");
  }

  const session = await openSession({ connect, headless, profileDir, startUrl: listUrl, onProgress });
  const { context, external } = getContextFromSession(session);

  try {
    if (connect) {
      onProgress?.("Csatlakozva a Chrome-hoz.");
    }

    const page = manualReady
      ? await findHasznaltautoPage(context)
      : await resolveWorkingPage(context, { connect, onProgress });

    if (!page) {
      throw new Error("Nincs hasznaltauto.hu lap a Chrome-ban. Nyisd meg a listát, majd ENTER.");
    }

    if (!connect && listUrl && page.url() === "about:blank") {
      await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
    }

    return await scrapeCardsFromPage(page, listUrl ?? page.url(), {
      onProgress,
      deep,
      debug,
      manualReady,
      fetchPhones,
    });
  } finally {
    if (!external) {
      await closeSession(session);
    } else {
      onProgress?.("Chrome nyitva maradt.");
    }
  }
}

export async function scrapeListPage(url, options = {}) {
  const headless = options.headless !== false && !options.connect;

  try {
    return await scrapeListPageOnce(url, { ...options, headless });
  } catch (error) {
    if (options.connect || !headless) throw error;
    options.onProgress?.("Újrapróbálás látható böngészővel...");
    return scrapeListPageOnce(url, { ...options, headless: false });
  }
}

export async function scrapeListing(url, options = {}) {
  const listingUrl = normalizeInputUrl(url);
  if (!listingUrl || !isListingUrl(listingUrl)) {
    throw new Error("Egyszeri hirdetéshez adj meg közvetlen hirdetés linket.");
  }

  const session = await openSession(options);
  const { context, external } = getContextFromSession(session);
  const page = await resolveWorkingPage(context, { connect: options.connect });

  try {
    if (page.url() !== listingUrl) {
      await page.goto(listingUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
    }
    const { parseListingHtml } = await import("./parse.mjs");
    const { waitForListingPage, revealPhoneNumber } = await import("./browser.mjs");
    const html = await waitForListingPage(page);
    const telefonszam = await revealPhoneNumber(page);
    const parsed = parseListingHtml(html, { url: listingUrl, phone: telefonszam });
    return { ...parsed, text: formatSingleResultText(parsed) };
  } finally {
    if (!external) await closeSession(session);
  }
}

export async function scrapeUrl(url, options = {}) {
  if (options.connect) {
    return scrapeListPage(url ? normalizeInputUrl(url) : null, options);
  }

  const normalized = url ? normalizeInputUrl(url) : null;
  if (!normalized) {
    throw new Error("Adj meg linket, vagy használd: npm start -- --connect");
  }

  if (isListPageUrl(normalized)) {
    return scrapeListPage(normalized, options);
  }
  return scrapeListing(normalized, options);
}
