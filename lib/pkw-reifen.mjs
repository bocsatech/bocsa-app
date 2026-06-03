/** Server — Reifen-JSON für pkw_fahrzeuge */

const REIFEN_KEYS = ["groesse", "profil", "typ", "depot_nr", "hersteller", "einlagerung"];

function trimOrNull(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function normalizePkwReifenSatz(raw) {
  const entry = raw && typeof raw === "object" ? raw : {};
  return {
    groesse: trimOrNull(entry.groesse ?? entry.reifen_groesse),
    profil: trimOrNull(entry.profil ?? entry.reifen_profil),
    typ: trimOrNull(entry.typ ?? entry.reifen_typ),
    depot_nr: trimOrNull(entry.depot_nr ?? entry.reifen_depot_nr),
    hersteller: trimOrNull(entry.hersteller ?? entry.reifen_hersteller),
    einlagerung: trimOrNull(entry.einlagerung ?? entry.reifen_einlagerung),
  };
}

function isEmptySatz(satz) {
  return REIFEN_KEYS.every((key) => !satz[key]);
}

export function serializePkwReifenSaetze(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizePkwReifenSatz).filter((satz) => !isEmptySatz(satz));
}

export function syncLegacyReifenColumns(reifen) {
  const first = reifen[0] ?? {};
  return {
    reifen_groesse: first.groesse ?? null,
    reifen_profil: first.profil ?? null,
    reifen_typ: first.typ ?? null,
    reifen_depot_nr: first.depot_nr ?? null,
    reifen_hersteller: first.hersteller ?? null,
    reifen_einlagerung: first.einlagerung ?? null,
  };
}
