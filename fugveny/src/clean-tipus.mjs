/**
 * Tipus / lista-cím tisztítás — marketing és alcím zaj levágása.
 * A meglévő CSV listából is futtatható: npm run clean:tipus -- in.csv out.csv
 */

function collapseSpaces(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

/** Végéről levágandó minták (több körben is futhatnak). */
const END_PATTERNS = [
  // készlet
  /\s*KÉSZLETRŐL!*$/i,
  /\s*KÉSZLETEN!*$/i,
  /\s*\bTLOP\b!*$/i,
  // áfa / számla (elgépelés: azámlával is)
  /\s*\d+\s*%-?os\s+[aá]f[aá]s\s+[asz]*[aá]ml[aá]val!*$/i,
  /\s*[aá]f[aá]s\s+[asz]*[aá]ml[aá]val!*$/i,
  // THM / akció — a SZENZÁCIÓS blokk a végéig megy
  /\s*[\d.,]+\s*%\s*THM!*$/i,
  /\s*\bTHM\b!*$/i,
  /\s*SZENZÁCIÓS\s+ÁRON\b.*$/i,
  // friss műszaki / euro / km alcím
  /\s*Friss\s+műszaki(?:\s+vizsgával)?!*$/i,
  /\s*Euro\s*\d+-?os\.?!*$/i,
  /\s*\d+(?:[.,]\d+)?\s*ezer\s*km!*$/i,
  /\s*\d[\d\s.]*\s*km!*$/i,
  // „Technológiai és Infotainment csomaggal” — a rövid trim (GS) megmarad
  /\s+\S+\s+és\s+\S+\s+csomaggal\b.*$/i,
  /\s+\S{7,}\s+csomaggal\b.*$/i,
  /\s+csomaggal\b.*$/i,
  /\s+csomag\b.*$/i,
  // „Itt az új …”
  /\s*Itt\s+az\s+új\s+\w+!*$/i,
  // maradék írásjelek a végén
  /\s*[.|!;,–—-]+$/u,
];

/**
 * Egy mezőből levágja a marketing / lista-alcím zajt.
 * A típusjellemzők (Automata, AWD, EU6, [7 személy]) megmaradnak.
 */
export function cleanTipusText(value) {
  let text = collapseSpaces(value);
  if (!text) return "";

  for (let round = 0; round < 12; round += 1) {
    let changed = false;
    for (const pattern of END_PATTERNS) {
      const next = text.replace(pattern, "").trim();
      if (next !== text) {
        text = next;
        changed = true;
      }
    }
    if (!changed) break;
  }

  return collapseSpaces(text);
}

export { END_PATTERNS };
