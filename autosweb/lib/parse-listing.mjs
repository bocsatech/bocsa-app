import { shortUrl } from "./url-utils.mjs";

const PHONE_RE = /(?:\+36|06)\s*[\d\s/-]{7,14}\d/;

const YEAR_KEYS = ["évjárat", "gyártási év", "gyartasi ev"];
const KM_KEYS = ["futásteljesítmény", "futasteljesitmeny", "kilométeróra", "kilometerora", "km"];
const PRICE_KEYS = ["vételár", "vetelar", "ár", "ar", "hirdetési ár"];
const TYPE_KEYS = ["jármű típus", "jarmu tipus", "típus", "tipus", "kategória", "kategoria", "kivitel", "típusjel"];

export function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .replace(/:$/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function pickValue(map, keys) {
  for (const key of keys) {
    const normalized = normalizeKey(key);
    for (const [entryKey, entryValue] of Object.entries(map)) {
      if (normalizeKey(entryKey) === normalized && cleanText(entryValue)) {
        return cleanText(entryValue);
      }
    }
    for (const [entryKey, entryValue] of Object.entries(map)) {
      if (normalizeKey(entryKey).includes(normalized) && cleanText(entryValue)) {
        return cleanText(entryValue);
      }
    }
  }
  return null;
}

function extractYear(value) {
  if (!value) return null;
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : cleanText(value);
}

function extractKm(value) {
  if (!value) return null;
  const match = value.match(/([\d\s.]+)\s*km/i);
  if (match) return `${match[1].replace(/\s/g, " ").trim()} km`;
  const digits = value.match(/^\d[\d\s.]*$/);
  return digits ? `${digits[0].replace(/\s/g, " ").trim()} km` : cleanText(value);
}

function extractPrice(value) {
  if (!value) return null;
  const match = value.match(/([\d\s.]+)\s*(Ft|EUR|€)/i);
  if (match) return `${match[1].replace(/\s/g, " ").trim()} ${match[2]}`;
  return cleanText(value);
}

function extractPhone(text) {
  const matches = String(text ?? "").match(new RegExp(PHONE_RE, "gi"));
  if (!matches?.length) return null;
  return cleanText(matches[0]);
}

function parseAttributesTable(html) {
  const map = {};
  const tableMatch = html.match(/<table[^>]*class="[^"]*hirdetesadatok[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return map;

  const rows = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  for (const row of rows) {
    const keyMatch = row[1].match(/<td[^>]*class="[^"]*bal[^"]*pontos[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
    const valueMatch = row[1].match(/<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/i);
    if (!keyMatch || !valueMatch) continue;

    const key = cleanText(keyMatch[1].replace(/<[^>]+>/g, ""));
    const value = cleanText(valueMatch[1].replace(/<[^>]+>/g, ""));
    if (key && value) map[key] = value;
  }

  return map;
}

function parseLabeledBlocks(html) {
  const map = {};
  const patterns = [
    />([^<:]{2,40}):<\/[^>]+>\s*<[^>]+>\s*<[^>]+>\s*([^<]+)</gi,
    /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi,
    /<span[^>]*>([\s\S]*?)<\/span>\s*<(?:strong|span|div)[^>]*>([\s\S]*?)<\/(?:strong|span|div)>/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const key = cleanText(match[1].replace(/<[^>]+>/g, ""));
      const value = cleanText(match[2].replace(/<[^>]+>/g, ""));
      if (!key || !value || key.length > 40) continue;
      if (!key.endsWith(":") && !TYPE_KEYS.concat(YEAR_KEYS, KM_KEYS, PRICE_KEYS).some((k) => normalizeKey(key).includes(k))) {
        continue;
      }
      map[key.replace(/:$/, "")] = value;
    }
  }

  return map;
}

function parseJsonLd(html) {
  const map = {};
  const scripts = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const script of scripts) {
    try {
      const data = JSON.parse(script[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item?.name) map["Cím"] = cleanText(item.name);
        if (item?.offers?.price) {
          const currency = item.offers.priceCurrency ?? "Ft";
          map["Ár"] = `${item.offers.price} ${currency}`;
        }
        if (item?.vehicleModelDate) map["Évjárat"] = String(item.vehicleModelDate);
        if (item?.mileageFromOdometer?.value) {
          map["Futásteljesítmény"] = `${item.mileageFromOdometer.value} km`;
        }
      }
    } catch {
      /* ignore */
    }
  }
  return map;
}

function parseTitle(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return cleanText(h1[1].replace(/<[^>]+>/g, ""));

  const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
  if (ogTitle) return cleanText(ogTitle[1]);

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title ? cleanText(title[1].replace(/\s*\|.*$/, "")) : null;
}

function parsePriceFromHtml(html) {
  const patterns = [
    /class="[^"]*price[^"]*"[^>]*>([^<]+)</i,
    />([\d\s.]+)\s*Ft</i,
    /"price"\s*:\s*"?([\d\s.]+)"?/i,
    /Vételár[^<]{0,40}<[^>]+>[^<]{0,20}([\d\s.]+)\s*Ft/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return extractPrice(match[1] + " Ft");
  }
  return null;
}

function parseYearFromTitle(title) {
  if (!title) return null;
  const match = title.match(/\((19|20)\d{2}(?:\/\d{1,2})?\)/);
  return match ? extractYear(match[0].replace(/[()]/g, "")) : null;
}

function parseVehicleType(title, map) {
  if (title) {
    const fromTitle = title
      .replace(/^eladó\s+/i, "")
      .replace(/\s*\((19|20)\d{2}.*\)\s*$/, "")
      .trim();
    if (fromTitle) return fromTitle;
  }

  return pickValue(map, TYPE_KEYS);
}

export function parseDescription(html) {
  const patterns = [
    /<div[^>]*class="[^"]*leiras[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id="[^"]*leiras[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<section[^>]*class="[^"]*leiras[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
    /Leírás[\s\S]{0,80}?<(?:div|p)[^>]*>([\s\S]{40,8000}?)<\/(?:div|p)>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    const text = cleanText(match[1].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "));
    if (text.length >= 20) return text;
  }

  return null;
}

export function parseListingHtml(html, { url = "", phone = null } = {}) {
  const attributeMap = {
    ...parseJsonLd(html),
    ...parseLabeledBlocks(html),
    ...parseAttributesTable(html),
  };

  const title = parseTitle(html);
  const jarmuTipus = parseVehicleType(title, attributeMap);
  const ar =
    extractPrice(pickValue(attributeMap, PRICE_KEYS)) ??
    parsePriceFromHtml(html);
  const evjarat =
    extractYear(pickValue(attributeMap, YEAR_KEYS)) ??
    parseYearFromTitle(title);
  const km = extractKm(pickValue(attributeMap, KM_KEYS));
  const telefonszam = phone ?? extractPhone(html);
  const leiras = parseDescription(html);

  return {
    url: cleanText(url),
    jarmuTipus,
    ar,
    evjarat,
    km,
    telefonszam,
    cim: title,
    leiras,
    nyersAdatok: attributeMap,
  };
}

function parseSummaryLine(text) {
  const map = {};
  if (!text) return map;

  const fuelMatch =
    text.match(/Hibrid\s*\([^)]+\)/i) ||
    text.match(/(?:^|[,(]\s*)((?:Elektromos|Diesel|Benzin|LPG|CNG)[^,)]*)/i);
  if (fuelMatch) map.Üzemanyag = cleanText(fuelMatch[0].replace(/^[,(]\s*/, ""));

  const yearMatch = text.match(/\b((?:19|20)\d{2})(?:\/(\d{1,2}))?\b/);
  if (yearMatch) {
    map.Évjárat = yearMatch[2] ? `${yearMatch[1]}/${yearMatch[2]}` : yearMatch[1];
  }

  const kmMatch = text.match(/([\d\s.]+)\s*km\b/i);
  if (kmMatch) map.Futásteljesítmény = `${kmMatch[1].trim()} km`;

  const ccMatch = text.match(/([\d\s.]+)\s*cm³/i);
  if (ccMatch) map.Hengerűrtartalom = ccMatch[1].replace(/\s/g, "");

  const powerMatch = text.match(/([\d.,]+)\s*kW/i);
  if (powerMatch) map.Teljesítmény = `${powerMatch[1]} kW`;

  return map;
}

export function mergeParsedListing(detail, card) {
  if (!card) return detail;
  const cardParsed = parseListingCard({
    url: card.url ?? detail.url,
    text: card.text,
    title: card.title,
  });
  const mergedAttrs = {
    ...(cardParsed.nyersAdatok ?? {}),
    ...(detail.nyersAdatok ?? {}),
  };

  return {
    ...detail,
    cim: detail.cim || cardParsed.cim,
    ar: detail.ar || cardParsed.ar,
    km: detail.km || cardParsed.km,
    evjarat: detail.evjarat || cardParsed.evjarat,
    jarmuTipus: detail.jarmuTipus || cardParsed.jarmuTipus,
    telefonszam: detail.telefonszam || cardParsed.telefonszam,
    nyersAdatok: mergedAttrs,
  };
}

export function parseListingCard({ url, text, title }) {
  const source = cleanText(`${title}\n${text}`);
  const summaryMap = parseSummaryLine(text);
  const arMatch = source.match(/([\d\s.]+)\s*Ft/i);
  const kmMatch = source.match(/([\d\s.]+)\s*km/i);
  const yearMatch = source.match(/\b(19|20)\d{2}\b/);
  const phoneMatch = source.match(/(?:\+36|06)[\s\d/-]{7,16}\d/);

  const jarmuTipus = cleanText(title)
    .replace(/^eladó\s+/i, "")
    .replace(/\s*\((19|20)\d{2}.*\)\s*$/, "")
    .trim();

  return {
    url: cleanText(url),
    jarmuTipus: jarmuTipus || null,
    ar: arMatch ? extractPrice(`${arMatch[1]} Ft`) : null,
    evjarat: yearMatch ? yearMatch[0] : null,
    km: kmMatch ? extractKm(`${kmMatch[1]} km`) : null,
    telefonszam: phoneMatch ? cleanText(phoneMatch[0]) : null,
    cim: cleanText(title) || null,
    forras: "lista oldal",
    nyersAdatok: summaryMap,
  };
}

export { shortUrl };
