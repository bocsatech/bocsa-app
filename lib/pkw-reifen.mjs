/** PKW Reifen — serialize + read (webpack + server kompatibilis) */

const REIFEN_KEYS = ["groesse", "profil", "typ", "depot_nr", "hersteller", "einlagerung"];

function trimOrNull(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function trimOrEmpty(value) {
  return String(value ?? "").trim();
}

export function emptyPkwReifenSatz() {
  return {
    groesse: "",
    profil: "",
    typ: "",
    depot_nr: "",
    hersteller: "",
    einlagerung: "",
  };
}

export function normalizePkwReifenSatz(raw) {
  const entry = raw && typeof raw === "object" ? raw : {};
  return {
    groesse: trimOrEmpty(entry.groesse ?? entry.reifen_groesse),
    profil: trimOrEmpty(entry.profil ?? entry.reifen_profil),
    typ: trimOrEmpty(entry.typ ?? entry.reifen_typ),
    depot_nr: trimOrEmpty(entry.depot_nr ?? entry.reifen_depot_nr),
    hersteller: trimOrEmpty(entry.hersteller ?? entry.reifen_hersteller),
    einlagerung: trimOrEmpty(entry.einlagerung ?? entry.reifen_einlagerung),
  };
}

function isEmptySatz(satz) {
  return REIFEN_KEYS.every((key) => !String(satz[key] ?? "").trim());
}

export function isPkwReifenSatzEmpty(satz) {
  return isEmptySatz(satz);
}

export function getPkwReifenSaetze(fz) {
  if (Array.isArray(fz?.reifen) && fz.reifen.length > 0) {
    return fz.reifen.map(normalizePkwReifenSatz);
  }

  const legacy = normalizePkwReifenSatz({
    groesse: fz?.reifen_groesse,
    typ: fz?.reifen_typ,
    profil: fz?.reifen_profil,
    depot_nr: fz?.reifen_depot_nr,
    hersteller: fz?.reifen_hersteller,
    einlagerung: fz?.reifen_einlagerung,
  });

  return isEmptySatz(legacy) ? [] : [legacy];
}

export function serializePkwReifenSaetze(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizePkwReifenSatz)
    .filter((satz) => !isEmptySatz(satz))
    .map((satz) => ({
      groesse: satz.groesse || null,
      profil: satz.profil || null,
      typ: satz.typ || null,
      depot_nr: satz.depot_nr || null,
      hersteller: satz.hersteller || null,
      einlagerung: satz.einlagerung || null,
    }));
}

export function syncLegacyReifenColumns(reifen) {
  const first = reifen[0] ?? emptyPkwReifenSatz();
  return {
    reifen_groesse: first.groesse || null,
    reifen_profil: first.profil || null,
    reifen_typ: first.typ || null,
    reifen_depot_nr: first.depot_nr || null,
    reifen_hersteller: first.hersteller || null,
    reifen_einlagerung: first.einlagerung || null,
  };
}

export function formatPkwReifenSatzKurz(satz) {
  const parts = [
    satz.groesse?.trim(),
    satz.profil?.trim() ? `Profil ${satz.profil.trim()}` : "",
    satz.typ?.trim(),
    satz.depot_nr?.trim() ? `Depot ${satz.depot_nr.trim()}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

export function formatPkwReifenListeKurz(fz) {
  const saetze = getPkwReifenSaetze(fz);
  if (saetze.length === 0) return "";
  return saetze.map(formatPkwReifenSatzKurz).filter(Boolean).join(" | ");
}
