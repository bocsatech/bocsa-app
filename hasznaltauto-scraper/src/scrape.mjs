import {
  closeSession,
  collectListingLinksFromCurrentPage,
  connectToOpenBrowser,
  extractListingCardsFromPage,
  getContextFromSession,
  launchBrowser,
  resolveWorkingPage,
  saveDebugHtml,
} from "./browser.mjs";
import { isListPageUrl, isListingUrl } from "./links.mjs";
import { formatListResultText, formatSingleResultText, parseListingCard } from "./parse.mjs";

const HASZNALTAUTO_RE = /^https?:\/\/(www\.)?hasznaltauto\.hu\//i;

export function normalizeInputUrl(input) {
  const url = String(input ?? "").trim();
  if (!url) return null;
  if (!HASZNALTAUTO_RE.test(url)) {
    throw new Error("Csak hasznaltauto.hu link támogatott.");
  }
  return url;
}

async function openSession({ connect = false, headless = true, profileDir } = {}) {
  if (connect) {
    return connectToOpenBrowser();
  }
  return launchBrowser({ profileDir, headless });
}

async function scrapeListFromOpenPage(page, listUrl, { onProgress, deep = false, debug = false } = {}) {
  const { listings, listUrl: resolvedListUrl } = await collectListingLinksFromCurrentPage(page, listUrl, {
    onProgress,
    deep,
    debug,
  });

  if (listings.length === 0) {
    if (debug) await saveDebugHtml(page, "hiba");
    throw new Error(
      [
        "Nem találtunk hirdetést a megnyitott oldalon.",
        "Görgess le a listán, várj a betöltésre, majd futtasd újra.",
        "Ha modell aloldal kell: npm start -- --connect --deep",
      ].join("\n")
    );
  }

  onProgress?.(`Adatok kinyerése a lista kártyáiról (új lap nélkül): ${listings.length} db`);

  const cards = await extractListingCardsFromPage(page);
  const cardByUrl = new Map(cards.map((card) => [card.url, card]));

  const results = listings.map((url) => {
    const card = cardByUrl.get(url);
    if (card) return parseListingCard(card);
    return parseListingCard({ url, text: "", title: "" });
  });

  const text = formatListResultText({
    listUrl: resolvedListUrl,
    results,
  });

  return {
    listUrl: resolvedListUrl,
    listingLinks: listings,
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
  } = options;

  const listUrl = url ? normalizeInputUrl(url) : null;
  if (listUrl && !isListPageUrl(listUrl)) {
    throw new Error("A megadott link nem lista oldal, hanem egy konkrét hirdetés.");
  }

  const session = await openSession({ connect, headless, profileDir });
  const { context, external } = getContextFromSession(session);
  const page = await resolveWorkingPage(context, { connect });

  try {
    if (connect) {
      onProgress?.("Csatlakozva a megnyitott Chrome-hoz.");
    } else {
      onProgress?.(headless ? "Meglévő böngésző lap használata..." : "Látható böngésző — megnyitott lap használata...");
      if (listUrl && !connect && page.url() === "about:blank") {
        await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
        await page.waitForTimeout(3000);
      }
    }

    return await scrapeListFromOpenPage(page, listUrl ?? page.url(), { onProgress, deep, debug });
  } finally {
    if (!external) {
      await closeSession(session);
    } else {
      onProgress?.("A megnyitott Chrome lap nyitva maradt.");
    }
  }
}

export async function scrapeListPage(url, options = {}) {
  const headless = options.headless !== false && !options.connect;

  try {
    return await scrapeListPageOnce(url, { ...options, headless });
  } catch (error) {
    if (options.connect || !headless) throw error;
    options.onProgress?.("Nem sikerült háttérben. Újrapróbálás látható böngészővel...");
    return scrapeListPageOnce(url, { ...options, headless: false });
  }
}

export async function scrapeListing(url, options = {}) {
  const listingUrl = normalizeInputUrl(url);
  if (!listingUrl || !isListingUrl(listingUrl)) {
    throw new Error("Egyszeri hirdetéshez adj meg közvetlen hirdetés linket, vagy használd a --connect módot listához.");
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
    const normalized = url ? normalizeInputUrl(url) : null;
    return scrapeListPage(normalized, options);
  }

  const normalized = url ? normalizeInputUrl(url) : null;
  if (!normalized) {
    throw new Error("Adj meg linket, vagy használd a --connect kapcsolót a megnyitott Chrome lappal.");
  }

  if (isListPageUrl(normalized)) {
    return scrapeListPage(normalized, options);
  }
  return scrapeListing(normalized, options);
}
