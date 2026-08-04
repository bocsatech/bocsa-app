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

function isIndividualListingUrl(url) {
  try {
    const path = new URL(url).pathname;
    return /\/szemelyauto\/.+-\d{5,}$/i.test(path);
  } catch {
    return false;
  }
}

async function extractRichCards(page) {
  return page.evaluate(() => {
    const listingRe = /\/szemelyauto\/[^?#]+-\d{5,}/i;
    const seen = new Set();
    const cards = [];

    const pushCard = (anchor, container) => {
      try {
        const absolute = new URL(anchor.href, window.location.href);
        if (absolute.hostname.replace(/^www\./, "") !== "hasznaltauto.hu") return;
        if (!listingRe.test(absolute.pathname)) return;
        const url = `${absolute.origin}${absolute.pathname}`;
        if (seen.has(url)) return;
        seen.add(url);

        const root = container || anchor.closest(".row, article, li, [class*='talalati']") || anchor.parentElement;
        const priceEl = root?.querySelector?.(".pricefield-primary, [class*='pricefield'], [class*='ar']");
        const img =
          root?.querySelector?.(
            ".talalatisor-kep img, .talalatikepek img, img[src*='hasznaltauto'], img[data-src]"
          ) || root?.querySelector?.("img");
        const imageUrl = img?.getAttribute("src") || img?.getAttribute("data-src") || img?.currentSrc || null;
        const text = (root?.innerText || "").replace(/\s+/g, " ").trim();
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
    };

    const rows = document.querySelectorAll(".row.talalati-sor, .talalati-sor, [class*='talalati']");
    for (const row of rows) {
      const anchor =
        row.querySelector(".cim-kontener h3 a") ||
        row.querySelector("h3 a[href*='/szemelyauto/']") ||
        row.querySelector("a[href*='/szemelyauto/']");
      if (anchor) pushCard(anchor, row);
    }

    // Fallback: minden egyedi hirdetés-link (ne brand lista URL)
    for (const anchor of document.querySelectorAll("a[href*='/szemelyauto/']")) {
      pushCard(anchor, anchor.closest(".row, article, li, [class*='talalati']") || anchor.parentElement);
    }

    return cards;
  });
}

async function waitForListings(page, onProgress, maxSeconds = 120) {
  const { countListingLinksOnPage } = await import("./links.mjs");
  const deadline = Date.now() + maxSeconds * 1000;
  let lastLog = 0;

  while (Date.now() < deadline) {
    const count = await countListingLinksOnPage(page);
    if (count > 0) return count;

    const title = await page.title();
    const now = Date.now();
    if (now - lastLog > 8000) {
      if (/Attention Required|biztonsági|Egy pillanat|Just a moment/i.test(title)) {
        onProgress?.(
          "Cloudflare: a megnyílt Chrome ablakban jelöld meg a pipát, amíg megjelennek az autók…"
        );
      } else {
        onProgress?.("Várakozás: használtautó.hu lista betöltése…");
      }
      lastLog = now;
    }
    await sleep(2000);
  }
  throw new Error(
    "Nem töltődtek be a hirdetések. Chrome ablakban oldd meg a Cloudflare-t, majd indítsd újra a keresést az appban."
  );
}

async function scrollListPage(page) {
  for (let i = 0; i < 5; i += 1) {
    await page.evaluate(() => window.scrollBy(0, Math.max(window.innerHeight * 1.4, 700)));
    await sleep(500);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(400);
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
    onProgress?.(`Használtautó lista: oldal ${pageNum}/${maxPages}…`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT_MS });

    if (pageNum === 1) {
      await waitForListings(page, onProgress);
    } else {
      await sleep(1000);
      const { countListingLinksOnPage } = await import("./links.mjs");
      const n = await countListingLinksOnPage(page);
      if (!n) {
        onProgress?.(`Üres oldal ${pageNum} — vége.`);
        break;
      }
    }

    await scrollListPage(page);
    const raw = await extractRichCards(page);
    if (!raw.length) {
      onProgress?.(`Nincs egyedi hirdetés link oldal ${pageNum}-en — vége.`);
      break;
    }

    let added = 0;
    for (const card of raw) {
      if (seen.has(card.url)) continue;
      seen.add(card.url);
      all.push(enrichCard(card));
      added += 1;
    }
    onProgress?.(`Oldal ${pageNum}: +${added} autó (összesen ${all.length})`);
    if (added === 0) break;
  }

  if (!all.length) {
    throw new Error(
      "0 egyedi autó a listán. Cloudflare / üres lista — nézd a Chrome ablakot, majd új keresés."
    );
  }

  return all;
}

/** Demo találatok — UI próba. Nincs valódi hirdetés-URL (az 404 lenne). */
export function demoHasznaltautoResults(filter = {}) {
  const pool = [
    ["BMW", "320d", 2019, 142000, 8990000, "diesel"],
    ["BMW", "520d", 2018, 168000, 7950000, "diesel"],
    ["BMW", "X3", 2021, 62000, 12990000, "diesel"],
    ["AUDI", "A4", 2021, 95000, 7900000, "diesel"],
    ["AUDI", "A3", 2020, 78000, 6490000, "benzin"],
    ["AUDI", "Q5", 2019, 110000, 10990000, "diesel"],
    ["VOLKSWAGEN", "Golf", 2021, 68000, 6250000, "benzin"],
    ["VOLKSWAGEN", "Passat", 2018, 145000, 5490000, "diesel"],
    ["VOLKSWAGEN", "Tiguan", 2022, 41000, 11200000, "benzin"],
    ["OPEL", "Astra", 2019, 98000, 4290000, "benzin"],
    ["OPEL", "Astra", 2021, 54000, 5890000, "benzin"],
    ["OPEL", "Corsa", 2020, 61000, 3990000, "benzin"],
    ["OPEL", "Insignia", 2018, 132000, 4690000, "diesel"],
    ["TOYOTA", "Corolla", 2022, 51000, 7490000, "hybrid"],
    ["TOYOTA", "Yaris", 2021, 38000, 5290000, "hybrid"],
    ["FORD", "Focus", 2019, 89000, 4590000, "benzin"],
    ["FORD", "Kuga", 2023, 34000, 9800000, "hybrid"],
    ["SKODA", "Octavia", 2018, 118000, 5100000, "diesel"],
    ["SKODA", "Fabia", 2020, 72000, 3890000, "benzin"],
    ["MERCEDES-BENZ", "C 220d", 2020, 89000, 10100000, "diesel"],
    ["SUZUKI", "Swift", 2023, 28000, 3600000, "benzin"],
    ["TESLA", "Model 3", 2024, 18000, 14900000, "elektromos"],
  ];

  const toDemoCard = ([brand, model, year, km, priceFt, fuel], index, idBase) => {
    const idNum = idBase + index;
    const brandSlug = slugifyBrand(brand);
    const modelSlug = slugifyModel(model);
    return {
      id: `ha-demo-${idNum}`,
      source: "hasznaltauto",
      demo: true,
      title: `${brand} ${model} (${year})`,
      brand,
      model,
      year,
      km,
      priceFt,
      priceLabel: `${priceFt.toLocaleString("hu-HU")} Ft`,
      fuel,
      imageUrl: null,
      // Nincs hamis listing id → 404. Safari csak élő scrape URL-lel.
      url: null,
      searchUrl: `https://www.hasznaltauto.hu/szemelyauto/${brandSlug}/${modelSlug}`,
      meta: `${year} · ${km.toLocaleString("hu-HU")} km`,
    };
  };

  const samples = pool.map((row, index) => toDemoCard(row, index, 20000000));

  let filtered = samples.filter((item) => matchesFilter(item, filter));

  const brands = filter.gyartmanyok ?? [];
  if (brands.length && filtered.length < 6) {
    const brand = brands[0];
    const modelBase = filter.modellek?.[0] || filtered[0]?.model || "320d";
    const need = 8 - filtered.length;
    const extra = Array.from({ length: Math.max(need, 0) }, (_, i) => {
      const year = 2017 + (i % 8);
      const km = 30000 + i * 12000;
      const priceFt = 3500000 + i * 400000;
      return toDemoCard([brand, modelBase, year, km, priceFt, "benzin"], i, 30000000);
    }).filter((item) => matchesFilter(item, filter));
    const seen = new Set(filtered.map((x) => x.id));
    for (const item of extra) {
      if (!seen.has(item.id)) filtered.push(item);
    }
  }

  return filtered;
}

/**
 * @param {object} filter SearchFilter-szerű objektum
 * @param {{ demo?: boolean, maxPages?: number, onProgress?: Function }} options
 */
function onlyIndividualListings(items) {
  return (items ?? []).filter((item) => isIndividualListingUrl(item.url));
}

export async function searchHasznaltauto(filter = {}, options = {}) {
  const listUrl = buildHasznaltautoListUrl(filter);

  // Explicit demo csak teszthez — az app NEM kér demót. Hamis link tilos.
  if (options.demo) {
    return {
      ok: true,
      mode: "demo",
      sourceUrl: listUrl,
      results: demoHasznaltautoResults(filter),
      warning: "Demo mód — nincs valódi hirdetés-link.",
    };
  }

  try {
    const scraped = await scrapeListPages(listUrl, {
      maxPages: options.maxPages ?? MAX_PAGES,
      onProgress: options.onProgress,
    });
    const results = onlyIndividualListings(scraped.filter((item) => matchesFilter(item, filter))).map(
      (item) => ({ ...item, demo: false })
    );
    return {
      ok: true,
      mode: "live",
      sourceUrl: listUrl,
      scrapedCount: scraped.length,
      results,
      warning:
        results.length === 0
          ? "A lista betöltődött, de a szűrőre nincs egyedi találat."
          : undefined,
    };
  } catch (error) {
    // Nincs demo-fallback: az appnak valódi autó kell, nem 404-es hamis link
    return {
      ok: false,
      mode: "error",
      sourceUrl: listUrl,
      results: [],
      warning: `Élő scrape sikertelen: ${error.message}`,
      error: error.message,
    };
  }
}
