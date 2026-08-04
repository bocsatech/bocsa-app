/**
 * Ideiglenes használtautó.hu keresés — listaoldal scrape (Chrome/Playwright).
 * Csak localhost Autoswebhez; nem hivatalos API.
 */

const MAX_PAGES = Number(process.env.HA_SEARCH_MAX_PAGES ?? 25);
const PAGE_TIMEOUT_MS = 90_000;
const PAGE_SUFFIX_RE = /\/page(\d+)$/i;

function stripPageFromUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname.replace(PAGE_SUFFIX_RE, "").replace(/\/$/, "") || "/";
    return parsed.toString();
  } catch {
    return url;
  }
}

function buildListPageUrl(baseUrl, pageNum) {
  const parsed = new URL(stripPageFromUrl(baseUrl));
  const path = parsed.pathname.replace(/\/$/, "") || "/";
  parsed.pathname = pageNum <= 1 ? path : `${path}/page${pageNum}`;
  return parsed.toString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugifyBrand(brand) {
  return String(brand ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function slugifyModel(model) {
  return slugifyBrand(model);
}

/** Kereső URL a szűrőből — első márka (+ modell), egyébként szemelyauto. */
export function buildHasznaltautoListUrl(filter = {}) {
  const brands = filter.gyartmanyok ?? filter.brands ?? [];
  const models = filter.modellek ?? filter.models ?? [];
  const brand = brands[0];
  if (!brand) {
    return "https://www.hasznaltauto.hu/szemelyauto";
  }
  const b = slugifyBrand(brand);
  const model = models[0];
  if (model) {
    const m = slugifyModel(model);
    return `https://www.hasznaltauto.hu/szemelyauto/${b}/${m}`;
  }
  return `https://www.hasznaltauto.hu/szemelyauto/${b}`;
}

function parsePriceFt(text) {
  const m = String(text ?? "").match(/([\d\s.]+)\s*Ft/i);
  if (!m) return null;
  const n = Number(m[1].replace(/[\s.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseKm(text) {
  const m = String(text ?? "").match(/([\d\s.]+)\s*km/i);
  if (!m) return null;
  const n = Number(m[1].replace(/[\s.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseYear(text) {
  const m = String(text ?? "").match(/\b((?:19|20)\d{2})\b/);
  return m ? Number(m[1]) : null;
}

function parseFuel(text) {
  const t = String(text ?? "").toLowerCase();
  if (t.includes("elektromos") || t.includes("electric")) return "elektromos";
  if (t.includes("hibrid") || t.includes("hybrid")) return "hybrid";
  if (t.includes("dízel") || t.includes("dizel") || t.includes("diesel")) return "diesel";
  if (t.includes("gáz") || t.includes("lpg") || t.includes("cng")) return "benzin-gaz";
  if (t.includes("benzin")) return "benzin";
  return null;
}

function splitBrandModel(title) {
  const clean = String(title ?? "").replace(/\s+/g, " ").trim();
  const parts = clean.split(/\s+/);
  if (parts.length < 2) return { brand: clean.toUpperCase(), model: "" };
  return { brand: parts[0].toUpperCase(), model: parts.slice(1).join(" ").replace(/\s*\(\d{4}\)\s*$/, "").trim() };
}

function enrichCard(raw) {
  const text = [raw.title, raw.text, raw.priceText, raw.kmText].filter(Boolean).join(" ");
  const { brand, model } = splitBrandModel(raw.title);
  const priceFt = parsePriceFt(raw.priceText || text);
  const km = parseKm(raw.kmText || text);
  const year = parseYear(raw.title) ?? parseYear(text);
  const idMatch = String(raw.url ?? "").match(/-(\d{5,})$/);
  return {
    id: idMatch ? `ha-${idMatch[1]}` : `ha-${Buffer.from(raw.url).toString("base64url").slice(0, 16)}`,
    source: "hasznaltauto",
    title: raw.title || "Használtautó hirdetés",
    brand,
    model,
    year,
    km,
    priceFt,
    priceLabel: priceFt != null ? `${priceFt.toLocaleString("hu-HU")} Ft` : (raw.priceText || "—"),
    fuel: parseFuel(text),
    imageUrl: raw.imageUrl || null,
    url: raw.url,
    meta: [year, km != null ? `${km.toLocaleString("hu-HU")} km` : null].filter(Boolean).join(" · "),
  };
}

function matchesFilter(item, filter = {}) {
  const brands = (filter.gyartmanyok ?? []).map((b) => b.toUpperCase());
  if (brands.length) {
    const ok = brands.some(
      (b) =>
        item.brand.includes(b) ||
        b.includes(item.brand) ||
        String(item.title).toUpperCase().includes(b)
    );
    if (!ok) return false;
  }
  const models = filter.modellek ?? [];
  if (models.length) {
    const hay = `${item.model} ${item.title}`.toLowerCase();
    if (!models.some((m) => hay.includes(String(m).toLowerCase()))) return false;
  }
  if (filter.evTol != null && item.year != null && item.year < filter.evTol) return false;
  if (filter.evIg != null && item.year != null && item.year > filter.evIg) return false;
  if (filter.kmTol != null && item.km != null && item.km < filter.kmTol) return false;
  if (filter.kmIg != null && item.km != null && item.km > filter.kmIg) return false;
  if (filter.arTol != null && item.priceFt != null && item.priceFt < filter.arTol) return false;
  if (filter.arIg != null && item.priceFt != null && item.priceFt > filter.arIg) return false;
  const fuels = filter.fuels ?? [];
  if (fuels.length && item.fuel && !fuels.includes(item.fuel)) return false;
  return true;
}

async function extractRichCards(page) {
  return page.evaluate(() => {
    const listingRe = /\/szemelyauto\/[^?#]+-\d{5,}/i;
    const seen = new Set();
    const cards = [];

    const rows = document.querySelectorAll(".row.talalati-sor, .talalati-sor, [class*='talalati']");
    for (const row of rows) {
      const anchor =
        row.querySelector(".cim-kontener h3 a") ||
        row.querySelector("h3 a[href*='/szemelyauto/']") ||
        row.querySelector("a[href*='/szemelyauto/']");
      if (!anchor) continue;
      try {
        const absolute = new URL(anchor.href, window.location.href);
        if (!listingRe.test(absolute.pathname)) continue;
        const url = `${absolute.origin}${absolute.pathname}`;
        if (seen.has(url)) continue;
        seen.add(url);

        const priceEl = row.querySelector(".pricefield-primary, [class*='pricefield'], [class*='ar']");
        const img =
          row.querySelector(".talalatisor-kep img, .talalatikepek img, img[src*='hasznaltauto'], img[data-src]") ||
          row.querySelector("img");
        const imageUrl = img?.getAttribute("src") || img?.getAttribute("data-src") || img?.currentSrc || null;
        const text = (row.innerText || "").replace(/\s+/g, " ").trim();
        const kmMatch = text.match(/(\d[\d\s.]*)\s*km/i);

        cards.push({
          url,
          title: (anchor.innerText || "").replace(/\s+/g, " ").trim(),
          priceText: (priceEl?.innerText || "").replace(/\s+/g, " ").trim(),
          kmText: kmMatch ? kmMatch[0] : "",
          imageUrl,
          text,
        });
      } catch {
        /* skip */
      }
    }
    return cards;
  });
}

async function scrapeListPages(listUrl, { maxPages = MAX_PAGES, onProgress } = {}) {
  const { acquireImportSession } = await import("./browser-session.mjs");
  const base = stripPageFromUrl(listUrl) || listUrl;
  const session = await acquireImportSession(base, {
    onProgress,
    preferCdp: true,
  });
  const page = session.context.pages()[0] ?? (await session.context.newPage());

  const all = [];
  const seen = new Set();

  for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
    const url = pageNum === 1 ? base : buildListPageUrl(base, pageNum);
    onProgress?.(`Használtautó lista: oldal ${pageNum}…`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT_MS });
    await sleep(800);

    const raw = await extractRichCards(page);
    if (!raw.length) {
      onProgress?.(`Üres oldal ${pageNum} — vége.`);
      break;
    }

    let added = 0;
    for (const card of raw) {
      if (seen.has(card.url)) continue;
      seen.add(card.url);
      all.push(enrichCard(card));
      added += 1;
    }
    onProgress?.(`Oldal ${pageNum}: +${added} (összesen ${all.length})`);
    if (added === 0) break;
  }

  return all;
}

/** Demo találatok, ha a scrape nem elérhető (Cloudflare / nincs Chrome). */
export function demoHasznaltautoResults(filter = {}) {
  const samples = [
    {
      id: "ha-demo-1",
      source: "hasznaltauto",
      title: "BMW 320d xDrive (2019)",
      brand: "BMW",
      model: "320d",
      year: 2019,
      km: 142000,
      priceFt: 8990000,
      priceLabel: "8 990 000 Ft",
      fuel: "diesel",
      imageUrl: null,
      url: "https://www.hasznaltauto.hu/szemelyauto/bmw/320/bmw_320d-11111111",
      meta: "2019 · 142 000 km",
    },
    {
      id: "ha-demo-2",
      source: "hasznaltauto",
      title: "Volkswagen Golf 1.5 TSI (2021)",
      brand: "VOLKSWAGEN",
      model: "Golf",
      year: 2021,
      km: 68000,
      priceFt: 6250000,
      priceLabel: "6 250 000 Ft",
      fuel: "benzin",
      imageUrl: null,
      url: "https://www.hasznaltauto.hu/szemelyauto/volkswagen/golf/volkswagen_golf-22222222",
      meta: "2021 · 68 000 km",
    },
    {
      id: "ha-demo-3",
      source: "hasznaltauto",
      title: "Toyota Corolla Hybrid (2022)",
      brand: "TOYOTA",
      model: "Corolla",
      year: 2022,
      km: 51000,
      priceFt: 7490000,
      priceLabel: "7 490 000 Ft",
      fuel: "hybrid",
      imageUrl: null,
      url: "https://www.hasznaltauto.hu/szemelyauto/toyota/corolla/toyota_corolla-33333333",
      meta: "2022 · 51 000 km",
    },
  ];
  return samples.filter((item) => matchesFilter(item, filter));
}

/**
 * @param {object} filter SearchFilter-szerű objektum
 * @param {{ demo?: boolean, maxPages?: number, onProgress?: Function }} options
 */
export async function searchHasznaltauto(filter = {}, options = {}) {
  const listUrl = buildHasznaltautoListUrl(filter);
  if (options.demo) {
    return {
      ok: true,
      mode: "demo",
      sourceUrl: listUrl,
      results: demoHasznaltautoResults(filter),
      warning: "Demo mód — nincs élő scrape.",
    };
  }

  try {
    const scraped = await scrapeListPages(listUrl, {
      maxPages: options.maxPages ?? MAX_PAGES,
      onProgress: options.onProgress,
    });
    const results = scraped.filter((item) => matchesFilter(item, filter));
    return {
      ok: true,
      mode: "live",
      sourceUrl: listUrl,
      scrapedCount: scraped.length,
      results,
    };
  } catch (error) {
    const demo = demoHasznaltautoResults(filter);
    return {
      ok: true,
      mode: "demo-fallback",
      sourceUrl: listUrl,
      results: demo,
      warning: `Élő scrape sikertelen (${error.message}). Demo találatok.`,
      error: error.message,
    };
  }
}
