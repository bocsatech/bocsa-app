import { parseLagerMenge } from "./lager-bestand";
import { dateYmdLocal, localDayEndIso, localDayStartIso } from "./pkw";
import {
  buildFahrzeugLookupMaps,
  filterAktiveStatusPkwBuchungen,
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

  const aktiv = [...filterAktiveStatusPkwBuchungen(buchungen)].sort((a, b) =>
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

export type PkwTerminZeitraumPreset = "tag" | "monat" | "jahr" | "zeitraum";

export function pkwTerminZeitraumRange(
  preset: PkwTerminZeitraumPreset,
  opts: {
    tag?: string;
    monat?: string;
    jahr?: string;
    von?: string;
    bis?: string;
  } = {}
): { from: string; to: string; label: string } {
  const today = dateYmdLocal();

  if (preset === "tag") {
    const d = opts.tag || today;
    return {
      from: localDayStartIso(d),
      to: localDayEndIso(d),
      label: d === today ? "Heute" : d,
    };
  }

  if (preset === "monat") {
    const ym = opts.monat || today.slice(0, 7);
    const [y, m] = ym.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const pad = (n: number) => String(n).padStart(2, "0");
    const start = `${y}-${pad(m)}-01`;
    const end = `${y}-${pad(m)}-${pad(lastDay)}`;
    return {
      from: localDayStartIso(start),
      to: localDayEndIso(end),
      label: ym,
    };
  }

  if (preset === "jahr") {
    const y = opts.jahr || String(new Date().getFullYear());
    return {
      from: localDayStartIso(`${y}-01-01`),
      to: localDayEndIso(`${y}-12-31`),
      label: y,
    };
  }

  const von = opts.von || today;
  const bis = opts.bis || von;
  const sortedVon = von <= bis ? von : bis;
  const sortedBis = von <= bis ? bis : von;
  return {
    from: localDayStartIso(sortedVon),
    to: localDayEndIso(sortedBis),
    label: `${sortedVon} – ${sortedBis}`,
  };
}
