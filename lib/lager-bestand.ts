import type { LagerTeil } from "./types/lager";

export type LagerBestandAlertKind = "below_min" | "above_max";

export type LagerBestandMeldung = {
  teil: LagerTeil;
  kind: LagerBestandAlertKind;
  grenze: number;
  lagerstand: number;
};

export function parseLagerMenge(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}

export function getLagerBestandAlert(teil: LagerTeil): LagerBestandAlertKind | null {
  const stand = parseLagerMenge(teil.lagerstand) ?? 0;
  const min = parseLagerMenge(teil.menge_min);
  const max = parseLagerMenge(teil.menge_max);

  if (min != null && stand <= min) return "below_min";
  if (max != null && stand >= max) return "above_max";
  return null;
}

export function getLagerBestandMeldungen(teile: LagerTeil[]): LagerBestandMeldung[] {
  const rows: LagerBestandMeldung[] = [];

  for (const teil of teile) {
    const stand = parseLagerMenge(teil.lagerstand) ?? 0;
    const min = parseLagerMenge(teil.menge_min);
    const max = parseLagerMenge(teil.menge_max);

    if (min != null && stand <= min) {
      rows.push({ teil, kind: "below_min", grenze: min, lagerstand: stand });
    }
    if (max != null && stand >= max) {
      rows.push({ teil, kind: "above_max", grenze: max, lagerstand: stand });
    }
  }

  return rows.sort((a, b) => {
    const kindOrder = a.kind === "below_min" && b.kind !== "below_min" ? -1 : 0;
    if (a.kind !== b.kind) return kindOrder || (a.kind === "above_max" ? 1 : -1);
    return a.teil.herstellernummer.localeCompare(b.teil.herstellernummer, "de");
  });
}

export function countLagerBestandMeldungen(teile: LagerTeil[]) {
  return getLagerBestandMeldungen(teile).length;
}

export function lagerBestandAlertLabel(kind: LagerBestandAlertKind) {
  return kind === "below_min" ? "Mindestmenge erreicht" : "Maximalmenge erreicht";
}

export function validateLagerMengenGrenzen(mengeMin: unknown, mengeMax: unknown): string | null {
  const min = parseLagerMenge(mengeMin);
  const max = parseLagerMenge(mengeMax);
  if (min != null && max != null && min > max) {
    return "Mindestmenge darf nicht größer als Maximalmenge sein.";
  }
  return null;
}
