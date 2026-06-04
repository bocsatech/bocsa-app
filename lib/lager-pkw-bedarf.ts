import { getPkwErsatzteile } from "./pkw-ersatzteile";
import { parseLagerMenge } from "./lager-bestand";

function normalizeKennzeichen(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}
import type { PkwBuchung, PkwFahrzeug } from "./types/pkw";
import type { LagerTeil } from "./types/lager";

const AKTIVE_BUCHUNG_STATUS = new Set(["angefragt", "bestaetigt", "in_arbeit"]);

export type LagerFahrzeugBedarfZeile = {
  teil: LagerTeil;
  bedarfMenge: number;
  lagerstand: number;
  fehlmenge: number;
  fahrzeuge: Array<{
    buchungId: string;
    fahrzeugId: string;
    kennzeichen: string;
    kunde: string | null;
    slotStart: string | null;
    source: string | null;
  }>;
};

function buchungIstAktiv(buchung: PkwBuchung, now = Date.now()) {
  if (!AKTIVE_BUCHUNG_STATUS.has(buchung.status)) return false;
  const start = new Date(buchung.slot_start).getTime();
  if (Number.isNaN(start)) return true;
  const horizonMs = 45 * 24 * 60 * 60 * 1000;
  const pastMs = 14 * 24 * 60 * 60 * 1000;
  return start >= now - pastMs && start <= now + horizonMs;
}

export function filterAktivePkwBuchungen(buchungen: PkwBuchung[]) {
  return buchungen.filter((b) => buchungIstAktiv(b));
}

export function buildFahrzeugLookupMaps(fahrzeuge: PkwFahrzeug[]) {
  const byId = new Map<string, PkwFahrzeug>();
  const byKennzeichen = new Map<string, PkwFahrzeug>();
  for (const fahrzeug of fahrzeuge) {
    byId.set(fahrzeug.id, fahrzeug);
    const kz = normalizeKennzeichen(fahrzeug.kennzeichen);
    if (kz && !byKennzeichen.has(kz)) byKennzeichen.set(kz, fahrzeug);
  }
  return { byId, byKennzeichen };
}

export function resolveFahrzeugForBuchung(
  buchung: Pick<PkwBuchung, "fahrzeug_id" | "kennzeichen">,
  lookup: ReturnType<typeof buildFahrzeugLookupMaps>
): PkwFahrzeug | null {
  if (buchung.fahrzeug_id) {
    const byId = lookup.byId.get(buchung.fahrzeug_id);
    if (byId) return byId;
  }
  const kz = normalizeKennzeichen(buchung.kennzeichen);
  if (!kz) return null;
  return lookup.byKennzeichen.get(kz) ?? null;
}

export function buildLagerFahrzeugBedarf(
  teile: LagerTeil[],
  fahrzeuge: PkwFahrzeug[],
  buchungen: PkwBuchung[]
): LagerFahrzeugBedarfZeile[] {
  const teilById = new Map(teile.map((t) => [t.id, t]));
  const lookup = buildFahrzeugLookupMaps(fahrzeuge);
  const bedarf = new Map<
    string,
    {
      menge: number;
      fahrzeuge: LagerFahrzeugBedarfZeile["fahrzeuge"];
    }
  >();

  for (const buchung of filterAktivePkwBuchungen(buchungen)) {
    // Try to resolve fahrzeug from DB lookup, or fallback to API's embedded fahrzeug data
    let fahrzeug = resolveFahrzeugForBuchung(buchung, lookup);
    if (!fahrzeug && buchung.fahrzeug) {
      // If we can't find in lookup but API provided fahrzeug data, use that
      fahrzeug = buchung.fahrzeug;
    }
    
    if (!fahrzeug) continue;
    const fahrzeugId = fahrzeug.id;

    const parts = getPkwErsatzteile(fahrzeug);
    if (!parts.length) continue;

    const kunde =
      fahrzeug.kunde != null
        ? [fahrzeug.kunde.firma, fahrzeug.kunde.nachname].filter(Boolean).join(" · ")
        : null;

    for (const part of parts) {
      const teilId = part.lagerTeilId;
      if (!teilById.has(teilId)) continue;
      const row = bedarf.get(teilId) ?? { menge: 0, fahrzeuge: [] };
      row.menge += 1;
      if (!row.fahrzeuge.some((v) => v.buchungId === buchung.id)) {
        row.fahrzeuge.push({
          buchungId: buchung.id,
          fahrzeugId,
          kennzeichen: fahrzeug.kennzeichen,
          kunde,
          slotStart: buchung.slot_start,
          source: buchung.source,
        });
      }
      bedarf.set(teilId, row);
    }
  }

  const rows: LagerFahrzeugBedarfZeile[] = [];
  for (const [teilId, agg] of bedarf) {
    const teil = teilById.get(teilId);
    if (!teil) continue;
    const lagerstand = parseLagerMenge(teil.lagerstand) ?? 0;
    if (lagerstand >= agg.menge) continue;
    rows.push({
      teil,
      bedarfMenge: agg.menge,
      lagerstand,
      fehlmenge: agg.menge - lagerstand,
      fahrzeuge: agg.fahrzeuge,
    });
  }

  return rows.sort((a, b) => b.fehlmenge - a.fehlmenge);
}

export function countLagerFahrzeugBedarf(
  teile: LagerTeil[],
  fahrzeuge: PkwFahrzeug[],
  buchungen: PkwBuchung[]
) {
  return buildLagerFahrzeugBedarf(teile, fahrzeuge, buchungen).length;
}
