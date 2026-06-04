import { parseLagerMenge } from "./lager-bestand";
import {
  buildFahrzeugLookupMaps,
  filterAktivePkwBuchungen,
  resolveFahrzeugForBuchung,
} from "./lager-pkw-bedarf";
import { getPkwErsatzteile } from "./pkw-ersatzteile";
import type { MaintenanceLagerLink } from "./types/maintenance";
import type { PkwBuchung, PkwFahrzeug } from "./types/pkw";
import type { LagerTeil } from "./types/lager";

export type LagerPkwTerminPartRow = {
  buchung: PkwBuchung;
  fahrzeug: PkwFahrzeug | null;
  part: MaintenanceLagerLink | null;
  teil: LagerTeil | null;
  lagerstand: number;
  fehlmenge: number;
  /** Termin ohne zugeordnete Ersatzteile */
  emptyParts: boolean;
};

export function buildLagerPkwTerminPartRows(
  teile: LagerTeil[],
  fahrzeuge: PkwFahrzeug[],
  buchungen: PkwBuchung[]
): LagerPkwTerminPartRow[] {
  const teilById = new Map(teile.map((t) => [t.id, t]));
  const lookup = buildFahrzeugLookupMaps(fahrzeuge);
  const rows: LagerPkwTerminPartRow[] = [];

  const aktiv = [...filterAktivePkwBuchungen(buchungen)].sort((a, b) =>
    a.slot_start.localeCompare(b.slot_start)
  );

  for (const buchung of aktiv) {
    let fahrzeug = resolveFahrzeugForBuchung(buchung, lookup);
    if (!fahrzeug && buchung.fahrzeug) {
      fahrzeug = buchung.fahrzeug;
    }

    if (!fahrzeug) {
      rows.push({
        buchung,
        fahrzeug: null,
        part: null,
        teil: null,
        lagerstand: 0,
        fehlmenge: 0,
        emptyParts: true,
      });
      continue;
    }

    const parts = getPkwErsatzteile(fahrzeug);
    if (!parts.length) {
      rows.push({
        buchung,
        fahrzeug,
        part: null,
        teil: null,
        lagerstand: 0,
        fehlmenge: 0,
        emptyParts: true,
      });
      continue;
    }

    for (const part of parts) {
      const teil = teilById.get(part.lagerTeilId) ?? null;
      const lagerstand = parseLagerMenge(teil?.lagerstand) ?? 0;
      rows.push({
        buchung,
        fahrzeug,
        part,
        teil,
        lagerstand,
        fehlmenge: Math.max(0, 1 - lagerstand),
        emptyParts: false,
      });
    }
  }

  return rows;
}

export function buchungIdForTerminRow(row: LagerPkwTerminPartRow) {
  return row.buchung.id;
}
