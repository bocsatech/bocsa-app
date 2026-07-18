import { cleanText, normalizeKey, pickValue } from "./parse-listing.mjs";

const EQUIPMENT_ALIASES = [
  ["könnyűfém felni", ["alufelni", "aluminium felni", "könnyűfém"]],
  ["bluetooth-os kihangosító", ["bluetooth"]],
  ["tempomat", ["tempomat", "sebességtartó"]],
  ["tolatóradar", ["parkolóradar", "radar", "parkassist"]],
  ["tolatókamera", ["tolatókamera", "kamera", "rear view"]],
  ["bőr belső", ["bőr", "bőrkarpit", "bőr ülés"]],
  ["LED fényszóró", ["led", "ledes"]],
  ["xenon fényszóró", ["xenon"]],
  ["start-stop/motormegállító rendszer", ["start-stop", "start stop"]],
  ["vonóhorog", ["vonóhorog", "towbar"]],
  ["GPS (navigáció)", ["navigáció", "navigation", "gps"]],
  ["garanciális", ["garanciális", "garancia"]],
  ["keveset futott", ["keveset futott"]],
  ["nem dohányzó", ["nem dohányzó", "nem dohanyzo"]],
];

export function parseSummarySpecs(text) {
  const map = {};
  if (!text) return map;

  const ccMatch = text.match(/([\d\s.]+)\s*cm³/i);
  if (ccMatch) map.Hengerűrtartalom = ccMatch[1].replace(/\s|\./g, "");

  const kwMatch = text.match(/([\d.,]+)\s*kW/i);
  const leMatch = text.match(/([\d.,]+)\s*LE\b/i);
  if (kwMatch && leMatch) {
    map.Teljesítmény = `${kwMatch[1].replace(",", ".")} kW / ${leMatch[1].replace(",", ".")} LE`;
  } else if (kwMatch) {
    map.Teljesítmény = `${kwMatch[1].replace(",", ".")} kW`;
  } else if (leMatch) {
    map.Teljesítmény = `${leMatch[1].replace(",", ".")} LE`;
  }

  const doorsMatch = text.match(/(\d)\s*ajtó/i);
  if (doorsMatch) map["Ajtók száma"] = doorsMatch[1];

  const seatsMatch = text.match(/(\d)\s*fő/i);
  if (seatsMatch) map["Szállítható személyek száma"] = seatsMatch[1];

  if (/\bcvt\b/i.test(text)) map["Sebességváltó"] = "CVT automata";
  else if (/\bautomata\b/i.test(text)) map["Sebességváltó"] = "Automata";
  else if (/\bmanuális\b/i.test(text)) map["Sebességváltó"] = "Manuális";

  const hatotavMatch =
    text.match(/\bLE,\s*(\d[\d\s.]*)\s*km\b/i) ||
    text.match(/,\s*(\d[\d\s.]*)\s*km\s*$/i);
  if (hatotavMatch && /\bhibrid|elektromos|phev|ev\b/i.test(text)) {
    map["Hatótáv"] = hatotavMatch[1].replace(/\s|\./g, "");
  }

  if (/\b(4x4|awd|összkerék|összkerekes)\b/i.test(text)) map.Hajtás = "Összkerék";
  else if (/\b(hátsó|hátsókerék)\b/i.test(text)) map.Hajtás = "Hátsó kerék";
  else if (/\b(első|elsőkerék|fwd)\b/i.test(text)) map.Hajtás = "Első kerék";

  return map;
}

export function mapSebessegvalto(value, hints = "") {
  const v = normalizeKey(`${value} ${hints}`);
  if (!v) return "";
  if (v.includes("cvt") || v.includes("fokozatmentes") || v.includes("e-cvt")) return "Fokozatmentes automata";
  if (v.includes("automata")) return "Automata";
  if (v.includes("manuális") && v.includes("6")) return "Manuális (6 seb.)";
  if (v.includes("manuális") && v.includes("5")) return "Manuális (5 seb.)";
  if (v.includes("manuális")) return "Manuális (6 seb.)";
  return cleanText(value);
}

export function mapHajtas(value) {
  const v = normalizeKey(value);
  if (!v) return "";
  if (v.includes("osszker") || v.includes("4x4") || v.includes("awd") || v.includes("4wd")) return "Összkerék";
  if (v.includes("hatso")) return "Hátsó kerék";
  if (v.includes("elso") || v.includes("fwd")) return "Első kerék";
  return cleanText(value);
}

export function mapHengerElrendezes(value) {
  const v = normalizeKey(value);
  if (!v) return "";
  if (v.includes("boxer") || v.includes("dobos")) return "Boxer";
  if (v === "v" || v.includes(" v ")) return "V";
  if (v.includes("w")) return "W";
  if (v.includes("sor")) return "Sor";
  return cleanText(value);
}

export function mapKlima(value, badges = []) {
  const v = normalizeKey([value, ...badges].filter(Boolean).join(" "));
  if (!v) return "";
  if (v.includes("tobbzona") || v.includes("többzónás")) return "digitális többzónás klíma";
  if (v.includes("ketzone") || v.includes("kétzónás")) return "digitális kétzónás klíma";
  if (v.includes("digitalis") || v.includes("digitális")) return "digitális klíma";
  if (v.includes("automata") && v.includes("klima")) return "automata klíma";
  if (v.includes("klima") || v.includes("klíma")) return "automata klíma";
  return "";
}

export function mapEquipmentFromBadges(badges = [], extraText = "") {
  const found = new Set();
  const hay = normalizeKey([...badges, extraText].join(" "));

  for (const [canonical, aliases] of EQUIPMENT_ALIASES) {
    if (hay.includes(normalizeKey(canonical))) {
      found.add(canonical);
      continue;
    }
    for (const alias of aliases) {
      if (hay.includes(normalizeKey(alias))) {
        found.add(canonical);
        break;
      }
    }
  }

  for (const badge of badges) {
    const b = cleanText(badge);
    if (b.length > 2 && b.length < 60) found.add(b);
  }

  return [...found];
}

export function applyMuszakiFields(data, parsed, m, badges = []) {
  const hints = [parsed.cim, parsed.jarmuTipus, parsed.leiras, parsed.cardText, ...badges]
    .filter(Boolean)
    .join(" ");
  const summarySpecs = parseSummarySpecs(hints);
  const merged = { ...summarySpecs, ...m };

  const powerRaw = pickValue(merged, ["teljesítmény", "teljesitmeny", "max. teljesítmény"]);
  if (!data.hengerurtartalom) {
    data.hengerurtartalom = digitsOnly(
      pickValue(merged, ["hengerűrtartalom", "hengerurtartalom", "cm³", "cm3"])
    );
  }
  if (!data.teljesitmeny_kw || !data.teljesitmeny_le) {
    const kwMatch = String(powerRaw ?? hints).match(/([\d.,]+)\s*kW/i);
    const leMatch = String(powerRaw ?? hints).match(/([\d.,]+)\s*LE\b/i);
    if (!data.teljesitmeny_kw && kwMatch) data.teljesitmeny_kw = kwMatch[1].replace(",", ".");
    if (!data.teljesitmeny_le && leMatch) data.teljesitmeny_le = leMatch[1].replace(",", ".");
  }
  if (!data.sebessegvalto) {
    data.sebessegvalto = mapSebessegvalto(
      pickValue(merged, ["sebességváltó", "sebessegvalto", "váltó"]),
      hints
    );
  } else {
    const normalized = mapSebessegvalto(data.sebessegvalto, hints);
    if (normalized) data.sebessegvalto = normalized;
  }
  if (!data.hajtas) {
    data.hajtas = mapHajtas(pickValue(merged, ["hajtás", "hajtas", "meghajtás", "hajtómű"]));
  } else {
    const normalized = mapHajtas(data.hajtas);
    if (normalized) data.hajtas = normalized;
  }
  if (!data.henger_elrendezes) {
    data.henger_elrendezes = mapHengerElrendezes(
      pickValue(merged, ["henger-elrendezés", "henger elrendezes"])
    );
  }
  if (!data.ajtok) data.ajtok = pickValue(merged, ["ajtók száma", "ajtok szama", "ajtók"]);
  if (!data.szemelyek) {
    data.szemelyek = digitsOnly(pickValue(merged, ["szállítható személyek száma", "szallithato szemelyek", "ülések"]));
  }
  if (!data.szin) data.szin = pickValue(merged, ["szín", "szin", "külső szín"]);
  if (!data.sajat_tomeg) data.sajat_tomeg = digitsOnly(pickValue(merged, ["saját tömeg", "sajat tomeg"]));
  if (!data.ossztomeg) data.ossztomeg = digitsOnly(pickValue(merged, ["össztömeg", "ossztomeg"]));
  if (!data.csomagtarto) data.csomagtarto = digitsOnly(pickValue(merged, ["csomagtartó", "csomagtarto"]));
  if (!data.co2_kibocsatas) {
    data.co2_kibocsatas = digitsOnly(pickValue(merged, ["co2-kibocsátás", "co2 kibocsatas", "co2"]));
  }
  if (!data.fogyasztas_varosi) {
    data.fogyasztas_varosi = firstNumber(pickValue(merged, ["városi fogyasztás", "varosi fogyasztas"]));
  }
  if (!data.fogyasztas_orszaguti) {
    data.fogyasztas_orszaguti = firstNumber(pickValue(merged, ["országúti fogyasztás", "orszaguti fogyasztas"]));
  }
  if (!data.fogyasztas_kombinalt) {
    data.fogyasztas_kombinalt = firstNumber(pickValue(merged, ["kombinált fogyasztás", "kombinalt fogyasztas"]));
  }
  if (!data.kornyezetvedelmi) {
    data.kornyezetvedelmi = pickValue(merged, ["környezetvédelmi osztály", "kornyezetvedelmi osztaly", "euro"]);
  }
  if (!data.akkumulator_kwh) {
    data.akkumulator_kwh = firstNumber(pickValue(merged, ["akkumulátor kapacitás", "akkumulator kapacitas", "akkumulátor"]));
  }
  if (!data.hatotav) {
    data.hatotav = digitsOnly(pickValue(merged, ["hatótáv", "hatotav", "elektromos hatótáv"]));
  }
  if (!data.tolto_csatlakozas) {
    data.tolto_csatlakozas = pickValue(merged, ["töltőcsatlakozó", "tolto csatlakozas", "töltő csatlakozó"]);
  }
  if (!data.klima) {
    data.klima = mapKlima(pickValue(merged, ["klíma", "klima", "klíma felszereltség"]), badges);
  }

  return data;
}

function digitsOnly(value) {
  const match = String(value ?? "").match(/[\d\s.]+/);
  return match ? match[0].replace(/\s|\./g, "") : "";
}

function firstNumber(value) {
  const n = parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? String(n) : digitsOnly(value);
}
