/** Known makes — longest first so "Mercedes-Benz" wins over "Mercedes". */
const MAKES = [
  "Alfa Romeo",
  "Aston Martin",
  "Land Rover",
  "Mercedes-Benz",
  "Mercedes Benz",
  "Rolls-Royce",
  "Range Rover",
  "Volkswagen",
  "Mercedes",
  "Chevrolet",
  "Citroen",
  "Citroën",
  "Peugeot",
  "Porsche",
  "Renault",
  "Hyundai",
  "Suzuki",
  "Toyota",
  "Nissan",
  "Subaru",
  "Mazda",
  "Volvo",
  "Skoda",
  "Škoda",
  "Seat",
  "SEAT",
  "Opel",
  "Ford",
  "Fiat",
  "Jeep",
  "Mini",
  "MINI",
  "Audi",
  "BMW",
  "Kia",
  "Honda",
  "Dacia",
  "Cupra",
  "Tesla",
  "Lexus",
  "Jaguar",
  "Dodge",
  "Chrysler",
  "Mitsubishi",
  "SsangYong",
  "Isuzu",
  "Iveco",
  "Smart",
  "MG",
  "DS",
].sort((a, b) => b.length - a.length);

const FUEL_RE =
  /(Dízel|Diesel|Benzin|Hibrid|Plug-?in\s*hibrid|Elektromos|LPG|CNG|Egyéb|Etanol)/i;

const SPECS_RE = new RegExp(
  `${FUEL_RE.source}\\s*,\\s*` +
    `((?:19|20)\\d{2}(?:\\/\\d{1,2})?)\\s*,\\s*` +
    `([\\d\\s.]+)\\s*cm[³3]\\s*,\\s*` +
    `(\\d+)\\s*kW\\s*,\\s*` +
    `(\\d+)\\s*LE\\s*,\\s*` +
    `([\\d\\s.]+)\\s*km`,
  "i"
);

export const CSV_HEADERS = [
  "Gyartmany",
  "Modell",
  "Tipus",
  "Uzemanyag",
  "Gyartasi_ev",
  "Hengerurtartalom",
  "Teljesitmeny_kW",
  "Teljesitmeny_LE",
  "Kmora_allas",
  "Vetelar",
];

export function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function digitsOnly(value) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  return digits || null;
}

export function normalizeFuel(value) {
  const raw = cleanText(value);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.startsWith("dízel") || lower.startsWith("dizel") || lower === "diesel") return "Diesel";
  if (lower.startsWith("benzin")) return "Benzin";
  if (lower.includes("plug") && lower.includes("hibrid")) return "Plug-in hibrid";
  if (lower.includes("hibrid")) return "Hibrid";
  if (lower.startsWith("elektromos") || lower.startsWith("electric")) return "Elektromos";
  if (lower === "lpg") return "LPG";
  if (lower === "cng") return "CNG";
  return raw;
}

/** "1.6 TDI ..." → "1,6 TDI ..."; "S-tronic" → "S- Tronic" style light normalize */
export function normalizeTipus(value) {
  let text = cleanText(value);
  if (!text) return null;
  text = text.replace(/^(\d+)\.(\d+)/, "$1,$2");
  text = text.replace(/\bS-tronic\b/gi, "S- Tronic");
  text = text.replace(/\bS tronic\b/gi, "S- Tronic");
  return text;
}

function titleCaseMake(make) {
  if (!make) return null;
  if (/^(bmw|mg|ds|vw)$/i.test(make)) return make.toUpperCase();
  if (/^mini$/i.test(make)) return "MINI";
  if (/^seat$/i.test(make)) return "SEAT";
  return make
    .split(/([\s-]+)/)
    .map((part) => {
      if (/^[\s-]+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

export function splitTitle(title) {
  const cleaned = cleanText(title)
    .replace(/\s+[—–-]\s+.*$/, "")
    .replace(/\s+(MAGYARORSZÁGI|1\.\s*TULAJ|FÉNYEZÉS|GARANCIA|ELADÓ).*$/i, "")
    .trim();

  if (!cleaned) {
    return { gyartmany: null, modell: null, tipus: null };
  }

  let rest = cleaned;
  let gyartmany = null;

  for (const make of MAKES) {
    const re = new RegExp(`^${make.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(rest)) {
      gyartmany = titleCaseMake(make);
      rest = rest.slice(make.length).trim();
      break;
    }
  }

  if (!gyartmany) {
    const first = rest.split(/\s+/)[0];
    gyartmany = titleCaseMake(first);
    rest = rest.slice(first.length).trim();
  }

  // Tipus starts at engine size: 1.6 / 1,6 / 2.0 / 116i style kept with modell if no size
  const engineMatch = rest.match(/^(.*?)(\d+[.,]\d+\b.*)$/);
  let modell = null;
  let tipus = null;

  if (engineMatch) {
    modell = cleanText(engineMatch[1]) || null;
    tipus = normalizeTipus(engineMatch[2]);
  } else {
    // Fallback: first 2 tokens = modell, rest = tipus
    const tokens = rest.split(/\s+/).filter(Boolean);
    if (tokens.length <= 2) {
      modell = tokens.join(" ") || null;
      tipus = null;
    } else {
      modell = tokens.slice(0, 2).join(" ");
      tipus = normalizeTipus(tokens.slice(2).join(" "));
    }
  }

  if (modell) {
    // "A1 Sportback" → keep casing mostly as-is, lightly normalize Sportback
    modell = modell.replace(/\bSportback\b/gi, "sportback");
  }

  return { gyartmany, modell, tipus };
}

export function parseSpecsFromText(text) {
  const source = cleanText(text);
  const match = source.match(SPECS_RE);
  if (!match) {
    // Softer fallback pieces
    const fuel = source.match(FUEL_RE)?.[1] ?? null;
    const year = source.match(/\b((?:19|20)\d{2}\/\d{1,2}|(?:19|20)\d{2})\b/)?.[1] ?? null;
    const cc = source.match(/([\d\s.]+)\s*cm[³3]/i)?.[1] ?? null;
    const kw = source.match(/(\d+)\s*kW/i)?.[1] ?? null;
    const le = source.match(/(\d+)\s*LE\b/i)?.[1] ?? null;
    const km = source.match(/([\d\s.]+)\s*km/i)?.[1] ?? null;
    return {
      uzemanyag: normalizeFuel(fuel),
      gyartasi_ev: year,
      hengerurtartalom: digitsOnly(cc),
      teljesitmeny_kw: kw,
      teljesitmeny_le: le,
      kmora_allas: digitsOnly(km),
    };
  }

  return {
    uzemanyag: normalizeFuel(match[1]),
    gyartasi_ev: match[2],
    hengerurtartalom: digitsOnly(match[3]),
    teljesitmeny_kw: match[4],
    teljesitmeny_le: match[5],
    kmora_allas: digitsOnly(match[6]),
  };
}

export function parsePriceFromText(text) {
  const match = cleanText(text).match(/([\d\s.]+)\s*Ft/i);
  if (!match) return null;
  const digits = digitsOnly(match[1]);
  return digits ? `${digits} Ft` : null;
}

export function parseHirdeteskod(text) {
  const match = cleanText(text).match(/Hirdet[eé]sk[oó]d\s*:\s*(\d+)/i);
  return match?.[1] ?? null;
}

/**
 * Parse one list-card into the átlagszámolás fields.
 * @param {{ url: string, title?: string, text?: string }} card
 */
export function parseListingCard(card) {
  const title = cleanText(card.title);
  const text = cleanText(card.text);
  const source = `${title} ${text}`;
  const { gyartmany, modell, tipus } = splitTitle(title || text);
  const specs = parseSpecsFromText(source);
  const vetelar = parsePriceFromText(source);

  return {
    Gyartmany: gyartmany,
    Modell: modell,
    Tipus: tipus,
    Uzemanyag: specs.uzemanyag,
    Gyartasi_ev: specs.gyartasi_ev,
    Hengerurtartalom: specs.hengerurtartalom,
    Teljesitmeny_kW: specs.teljesitmeny_kw
      ? `${specs.teljesitmeny_kw} KW`
      : null,
    Teljesitmeny_LE: specs.teljesitmeny_le
      ? `${specs.teljesitmeny_le} LE`
      : null,
    Kmora_allas: specs.kmora_allas,
    Vetelar: vetelar,
  };
}

export function toCsvRow(row) {
  return CSV_HEADERS.map((key) => {
    const raw = row[key] ?? "";
    const value = String(raw);
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }).join(",");
}

export function rowsToCsv(rows) {
  return [CSV_HEADERS.join(","), ...rows.map(toCsvRow)].join("\n") + "\n";
}
