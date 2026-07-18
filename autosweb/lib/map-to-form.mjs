import { pickValue, cleanText, normalizeKey } from "./parse-listing.mjs";

const COUNTY_NAMES = [
  "Budapest",
  "Pest",
  "Fejér",
  "Győr-Moson-Sopron",
  "Komárom-Esztergom",
  "Veszprém",
  "Baranya",
  "Bács-Kiskun",
  "Békés",
  "Borsod-Abaúj-Zemplén",
  "Csongrád-Csanád",
  "Hajdú-Bihar",
  "Heves",
  "Jász-Nagykun-Szolnok",
  "Nógrád",
  "Somogy",
  "Szabolcs-Szatmár-Bereg",
  "Tolna",
  "Vas",
  "Zala",
];

function digits(value) {
  const match = String(value ?? "").match(/[\d\s.]+/);
  return match ? match[0].replace(/\s|\./g, "") : "";
}

function parseYearMonth(value) {
  if (!value) return { ev: "", honap: "" };
  const match = String(value).match(/(19|20)\d{2}(?:\/(\d{1,2}))?/);
  if (!match) {
    const yearOnly = String(value).match(/\b(19|20)\d{2}\b/);
    return { ev: yearOnly?.[0] ?? "", honap: "" };
  }
  return { ev: match[0].slice(0, 4), honap: match[2] ? String(Number(match[2])) : "" };
}

function parsePower(value) {
  if (!value) return { kw: "", le: "" };
  const kwMatch = value.match(/([\d.,]+)\s*kW/i);
  const leMatch = value.match(/([\d.,]+)\s*LE/i);
  return {
    kw: kwMatch ? kwMatch[1].replace(",", ".") : "",
    le: leMatch ? leMatch[1].replace(",", ".") : "",
  };
}

function parsePhoneParts(phone) {
  if (!phone) return null;
  const compact = phone.replace(/[^\d+]/g, "");
  const match = compact.match(/^(\+36|06)(\d{1,2})(\d{6,8})$/);
  if (!match) return null;
  const orszag = match[1].startsWith("06") ? "+36" : match[1];
  const szam = match[3].replace(/(\d{3})(\d+)/, "$1 $2");
  return { orszag, korzet: match[2], szam };
}

function extractListingId(url) {
  const match = String(url ?? "").match(/-(\d{5,})(?:[/?#]|$)/);
  return match ? match[1] : "";
}

function parseTitleParts(title) {
  const clean = cleanText(title)
    .replace(/^eladó\s+/i, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  return {
    gyartmany: parts[0] ?? "",
    modell: parts[1] ?? "",
    rest: parts.slice(2).join(" "),
  };
}

function mapFuel(value) {
  const v = normalizeKey(value);
  if (!v) return "";
  if (v.includes("phev") || (v.includes("hibrid") && v.includes("benzin"))) return "Benzin/elektromos";
  if (v.includes("hibrid") && v.includes("diesel")) return "Diesel/elektromos";
  if (v.includes("elektromos") && v.includes("benzin")) return "Benzin/elektromos";
  if (v.includes("elektromos") && v.includes("diesel")) return "Diesel/elektromos";
  if (v.includes("elektromos")) return "Elektromos";
  if (v.includes("diesel")) return "Diesel";
  if (v.includes("lpg") || v.includes("gaz")) return "LPG/benzin";
  if (v.includes("cng")) return "CNG/benzin";
  if (v.includes("hibrid")) return "Benzin/elektromos";
  if (v.includes("benzin")) return "Benzin";
  return cleanText(value);
}

function mapKivitel(value) {
  const v = normalizeKey(value);
  if (!v) return "";
  if (v.includes("suv") || v.includes("crossover") || v.includes("terepjaro")) return "SUV / Crossover";
  if (v.includes("kombi") || v.includes("wagon") || v.includes("estate")) return "Kombi";
  if (v.includes("ferde") || v.includes("hatchback")) return "Ferdehátú";
  if (v.includes("sedan") || v.includes("szedan")) return "Szedán";
  if (v.includes("egyteru") || v.includes("mpv")) return "Egyterű";
  if (v.includes("kupe") || v.includes("coupe")) return "Kupé";
  if (v.includes("cabrio") || v.includes("convertible")) return "Cabrio";
  return cleanText(value);
}

function mapAllapot(value) {
  const v = normalizeKey(value);
  if (!v) return "";
  if (v.includes("ujra") || v.includes("újszer")) return "Újszerű";
  if (v.includes("serulesmentes") || v.includes("sérülésmentes")) return "Sérülésmentes";
  if (v.includes("serult") || v.includes("sérült")) return "Sérült";
  if (v.includes("normal") || v.includes("normál") || v.includes("hasznalt") || v.includes("használt")) {
    return "Normál";
  }
  return cleanText(value);
}

function mapOkmanyJelleg(value) {
  const v = normalizeKey(value);
  if (!v) return "";
  if (v.includes("kulfold") || v.includes("külföld")) return "Érvényes külföldi okmányokkal";
  if (v.includes("magyar") || v.includes("forgalmi")) return "Érvényes magyar okmányokkal";
  return cleanText(value);
}

function mapOkmanyErvenyesseg(value) {
  const v = normalizeKey(value);
  if (!v) return "";
  if (v.includes("lejart") || v.includes("lejárt")) return "Lejárt";
  if (v.includes("ervenyes") || v.includes("érvényes")) return "Érvényes";
  return cleanText(value);
}

function inferTipus(titleParts, parsed, m) {
  const fromTable = pickValue(m, ["típus", "tipus", "felszereltség", "felszereltseg"]);
  if (fromTable) return fromTable;
  if (titleParts.rest) return titleParts.rest;
  const cim = cleanText(parsed.cim || "");
  const withoutBrandModel = cim
    .replace(new RegExp(`^${titleParts.gyartmany}\\s+`, "i"), "")
    .replace(new RegExp(`^${titleParts.modell}\\s+`, "i"), "")
    .replace(/\s*\((19|20)\d{2}.*\)\s*$/, "")
    .trim();
  return withoutBrandModel || cim || "—";
}

function applyRequiredDefaults(data, parsed, titleParts, m) {
  if (!data.kivitel) {
    data.kivitel = mapKivitel(
      pickValue(m, ["kivitel", "kategória", "kategoria", "szerkezeti változat", "szerkezeti valtozat"])
    );
  }
  if (!data.allapot) {
    data.allapot = mapAllapot(pickValue(m, ["állapot", "allapot"])) || "Normál";
  }
  if (!data.okmany_jelleg) {
    data.okmany_jelleg =
      mapOkmanyJelleg(pickValue(m, ["okmányok jellege", "okmanyok jellege"])) ||
      "Érvényes magyar okmányokkal";
  }
  if (!data.okmany_ervenyesseg) {
    data.okmany_ervenyesseg =
      mapOkmanyErvenyesseg(pickValue(m, ["okmányok érvényessége", "okmanyok ervenyessege"])) || "Érvényes";
  }
  if (!data.tipus) {
    data.tipus = inferTipus(titleParts, parsed, m);
  }
  if (!data.uzemanyag) {
    data.uzemanyag = mapFuel(pickValue(m, ["üzemanyag", "uzemanyag"]));
  }
  if (!data.gyartmany && titleParts.gyartmany) {
    data.gyartmany = titleParts.gyartmany.toUpperCase();
  }
  if (!data.modell && titleParts.modell) {
    data.modell = titleParts.modell;
  }
  return data;
}

function mapCounty(location) {
  if (!location) return { megye: "", telepules: "" };
  const text = cleanText(location);
  for (const county of COUNTY_NAMES) {
    if (normalizeKey(text).includes(normalizeKey(county))) {
      const telepules = text.replace(new RegExp(county, "i"), "").replace(/^[,·\s-]+/, "").trim();
      return { megye: county, telepules };
    }
  }
  return { megye: "", telepules: text };
}

function firstNumber(value) {
  const n = parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? String(n) : digits(value);
}

export function mapListingToForm(parsed) {
  const m = parsed.nyersAdatok ?? {};
  const titleParts = parseTitleParts(parsed.cim || parsed.jarmuTipus || "");
  const gyartEv = parseYearMonth(
    pickValue(m, ["évjárat", "gyártási év"]) || parsed.evjarat
  );
  const forgalom = parseYearMonth(
    pickValue(m, [
      "első magyarországi forgalomba helyezés",
      "elso magyarorszagi forgalomba helyezes",
      "első forgalomba helyezés",
    ])
  );
  const muszaki = parseYearMonth(pickValue(m, ["műszaki vizsga érvényes", "muszaki vizsga"]));
  const power = parsePower(pickValue(m, ["teljesítmény", "teljesitmeny"]));
  const location = mapCounty(
    pickValue(m, ["megtalálható", "megtalalhato", "település", "telepules", "megye"])
  );
  const phone = parsePhoneParts(parsed.telefonszam);
  const arFt = digits(parsed.ar || pickValue(m, ["vételár", "vetelar"]));
  const arEur = digits(pickValue(m, ["ár (eur)", "ar (eur)", "eur"]));

  const data = {
    forras_url: parsed.url || "",
    hasznaltauto_hirdetes_id: extractListingId(parsed.url),
    hirdetes_cime: parsed.cim || "",
    gyartmany: pickValue(m, ["gyártmány", "gyartmany"]) || titleParts.gyartmany,
    modell: pickValue(m, ["modell"]) || titleParts.modell,
    tipus: pickValue(m, ["típus", "tipus"]) || titleParts.rest,
    kivitel: mapKivitel(
      pickValue(m, ["kivitel", "kategória", "kategoria", "szerkezeti változat", "szerkezeti valtozat"])
    ),
    egyeb_tipus: pickValue(m, ["egyéb típus", "egyeb tipus"]) || "",
    uzemanyag: mapFuel(pickValue(m, ["üzemanyag", "uzemanyag"])),
    gyartasi_ev: gyartEv.ev,
    gyartasi_honap: gyartEv.honap,
    forgalomba_helyezes_ev: forgalom.ev,
    forgalomba_helyezes_honap: forgalom.honap,
    muszaki_ev: muszaki.ev,
    muszaki_honap: muszaki.honap,
    allapot: mapAllapot(pickValue(m, ["állapot", "allapot"])),
    km: digits(parsed.km || pickValue(m, ["futásteljesítmény", "futasteljesitmeny"])),
    okmany_jelleg: mapOkmanyJelleg(pickValue(m, ["okmányok jellege", "okmanyok jellege"])),
    okmany_ervenyesseg: mapOkmanyErvenyesseg(
      pickValue(m, ["okmányok érvényessége", "okmanyok ervenyessege"])
    ),
    alvazszam: pickValue(m, ["alvázszám", "alvazszam", "vin"]),
    rendszam: pickValue(m, ["rendszám", "rendszam"]),
    tulajdonosok_szama: pickValue(m, ["tulajdonosok száma", "tulajdonos"]),
    ajtok: pickValue(m, ["ajtók száma", "ajtok szama", "ajtók"]),
    szemelyek: digits(pickValue(m, ["szállítható személyek száma", "szallithato szemelyek"])),
    hengerurtartalom: digits(pickValue(m, ["hengerűrtartalom", "hengerurtartalom"])),
    teljesitmeny_kw: power.kw,
    teljesitmeny_le: power.le,
    kornyezetvedelmi: pickValue(m, ["környezetvédelmi osztály", "kornyezetvedelmi osztaly"]),
    co2_kibocsatas: digits(pickValue(m, ["co2-kibocsátás", "co2 kibocsatas", "co2"])),
    fogyasztas_varosi: firstNumber(pickValue(m, ["városi fogyasztás", "varosi fogyasztas"])),
    fogyasztas_orszaguti: firstNumber(pickValue(m, ["országúti fogyasztás", "orszaguti fogyasztas"])),
    fogyasztas_kombinalt: firstNumber(pickValue(m, ["kombinált fogyasztás", "kombinalt fogyasztas"])),
    sebessegvalto: pickValue(m, ["sebességváltó", "sebessegvalto"]),
    hajtas: pickValue(m, ["hajtás", "hajtas", "meghajtás"]),
    henger_elrendezes: pickValue(m, ["henger-elrendezés", "henger elrendezes"]),
    sajat_tomeg: digits(pickValue(m, ["saját tömeg", "sajat tomeg"])),
    ossztomeg: digits(pickValue(m, ["össztömeg", "ossztomeg"])),
    szin: pickValue(m, ["szín", "szin"]),
    csomagtarto: digits(pickValue(m, ["csomagtartó", "csomagtarto"])),
    akkumulator_kwh: firstNumber(pickValue(m, ["akkumulátor kapacitás", "akkumulator kapacitas", "akkumulátor"])),
    hatotav: digits(pickValue(m, ["hatótáv", "hatotav", "elektromos hatótáv"])),
    tolto_csatlakozas: pickValue(m, ["töltőcsatlakozó", "tolto csatlakozas"]),
    vetelar: arFt,
    vetelar_eur: arEur,
    forgalomba_helyezes_ar: digits(
      pickValue(m, ["forgalomba helyezés ára", "magyarországi forgalomba helyezés"])
    ),
    leiras: parsed.leiras || "",
    megye: location.megye,
    telepules: location.telepules,
    iranyitoszam: pickValue(m, ["irányítószám", "iranyitoszam"]),
  };

  if (phone) {
    data.telefon1_orszag = phone.orszag;
    data.telefon1_korzet = phone.korzet;
    data.telefon1_szam = phone.szam;
  }

  const meta = pickValue(m, ["hirdetés azonosító", "hirdetes azonosito"]);
  if (meta && !data.hasznaltauto_hirdetes_id) {
    data.hasznaltauto_hirdetes_id = digits(meta);
  }

  applyRequiredDefaults(data, parsed, titleParts, m);

  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== "" && value != null));
}

export function mapCardPreview(card, parsed) {
  return {
    url: card.url,
    cim: parsed.cim || card.title || card.jarmuTipus || "—",
    ar: parsed.ar || card.ar || "—",
    km: parsed.km || card.km || "—",
    evjarat: parsed.evjarat || card.evjarat || "—",
    form: mapListingToForm(parsed),
  };
}
