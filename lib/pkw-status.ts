import { formatGermanDate, parseGermanDate } from "./dates";
import type { PkwBuchung, PkwFahrzeug } from "./types/pkw";

export function hasPkwValue(value: unknown): boolean {
  if (value == null) return false;
  return String(value).trim().length > 0;
}

export function isPkwDateValidOnOrBefore(value: unknown, reference = new Date()): boolean {
  const date = parseGermanDate(value);
  if (!date) return false;
  const ref = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  return date.getTime() >= ref.getTime();
}

export function getPkwParagraf57aValue(fz: PkwFahrzeug): string {
  return formatGermanDate(fz.paragraf_57a_gultig_bis) || String(fz.paragraf_57a_gultig_bis ?? "").trim();
}

export function getLastPkwBuchung(
  fahrzeugId: string,
  buchungenByFahrzeug: Map<string, PkwBuchung[]>
): PkwBuchung | null {
  const list = buchungenByFahrzeug.get(fahrzeugId) ?? [];
  if (list.length === 0) return null;
  return [...list].sort(
    (a, b) => new Date(b.slot_start).getTime() - new Date(a.slot_start).getTime()
  )[0];
}

export function buildPkwBuchungenByFahrzeug(buchungen: PkwBuchung[]): Map<string, PkwBuchung[]> {
  const map = new Map<string, PkwBuchung[]>();
  for (const buchung of buchungen) {
    if (!buchung.fahrzeug_id) continue;
    const list = map.get(buchung.fahrzeug_id) ?? [];
    list.push(buchung);
    map.set(buchung.fahrzeug_id, list);
  }
  return map;
}
