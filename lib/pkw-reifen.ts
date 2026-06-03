import type { PkwFahrzeug, PkwReifenSatz } from "./types/pkw";

export const REIFEN_SATZ_FIELDS: Array<{
  key: keyof PkwReifenSatz;
  label: string;
  placeholder?: string;
}> = [
  { key: "groesse", label: "Reifengröße", placeholder: "z. B. 205/55 R16" },
  { key: "profil", label: "Reifenprofil (Profiltiefe)", placeholder: "z. B. 6,5 mm" },
  { key: "typ", label: "Reifentyp", placeholder: "Sommer, Winter, Ganzjahres" },
  { key: "depot_nr", label: "Reifen-Depot-Nr.", placeholder: "Lagerplatz / Depot-Nr." },
  { key: "hersteller", label: "Reifenhersteller", placeholder: "z. B. Continental" },
  {
    key: "einlagerung",
    label: "Einlagerung / Hinweis",
    placeholder: "z. B. Sommerreifen eingelagert",
  },
];

export function emptyPkwReifenSatz(): PkwReifenSatz {
  return {
    groesse: "",
    profil: "",
    typ: "",
    depot_nr: "",
    hersteller: "",
    einlagerung: "",
  };
}

function trimOrEmpty(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizePkwReifenSatz(raw: unknown): PkwReifenSatz {
  const entry = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    groesse: trimOrEmpty(entry.groesse ?? entry.reifen_groesse),
    profil: trimOrEmpty(entry.profil ?? entry.reifen_profil),
    typ: trimOrEmpty(entry.typ ?? entry.reifen_typ),
    depot_nr: trimOrEmpty(entry.depot_nr ?? entry.reifen_depot_nr),
    hersteller: trimOrEmpty(entry.hersteller ?? entry.reifen_hersteller),
    einlagerung: trimOrEmpty(entry.einlagerung ?? entry.reifen_einlagerung),
  };
}

export function isPkwReifenSatzEmpty(satz: PkwReifenSatz) {
  return REIFEN_SATZ_FIELDS.every(({ key }) => !satz[key]?.trim());
}

export function getPkwReifenSaetze(
  fz: Pick<
    PkwFahrzeug,
    | "reifen"
    | "reifen_groesse"
    | "reifen_typ"
    | "reifen_profil"
    | "reifen_depot_nr"
    | "reifen_hersteller"
    | "reifen_einlagerung"
  >
): PkwReifenSatz[] {
  if (Array.isArray(fz.reifen) && fz.reifen.length > 0) {
    return fz.reifen.map(normalizePkwReifenSatz);
  }

  const legacy = normalizePkwReifenSatz({
    groesse: fz.reifen_groesse,
    typ: fz.reifen_typ,
    profil: fz.reifen_profil,
    depot_nr: fz.reifen_depot_nr,
    hersteller: fz.reifen_hersteller,
    einlagerung: fz.reifen_einlagerung,
  });

  return isPkwReifenSatzEmpty(legacy) ? [] : [legacy];
}

export function serializePkwReifenSaetze(saetze: PkwReifenSatz[]) {
  return saetze
    .map(normalizePkwReifenSatz)
    .filter((satz) => !isPkwReifenSatzEmpty(satz))
    .map((satz) => ({
      groesse: satz.groesse || null,
      profil: satz.profil || null,
      typ: satz.typ || null,
      depot_nr: satz.depot_nr || null,
      hersteller: satz.hersteller || null,
      einlagerung: satz.einlagerung || null,
    }));
}

export function syncLegacyReifenColumns(reifen: PkwReifenSatz[]) {
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

export function formatPkwReifenSatzKurz(satz: PkwReifenSatz) {
  const parts = [
    satz.groesse?.trim(),
    satz.profil?.trim() ? `Profil ${satz.profil.trim()}` : "",
    satz.typ?.trim(),
    satz.depot_nr?.trim() ? `Depot ${satz.depot_nr.trim()}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

export function formatPkwReifenListeKurz(fz: Parameters<typeof getPkwReifenSaetze>[0]) {
  const saetze = getPkwReifenSaetze(fz);
  if (saetze.length === 0) return "";
  return saetze.map(formatPkwReifenSatzKurz).filter(Boolean).join(" | ");
}
