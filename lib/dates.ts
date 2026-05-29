/**
 * Einziges erlaubtes Datumsformat in der Anwendung: TT.MM.JJJJ (z. B. 18.05.2026).
 * ISO (2026-05-18) wird nur beim Lesen alter DB-Werte akzeptiert und sofort umgewandelt.
 */

export const DE_DATE_PLACEHOLDER = "TT.MM.JJJJ";

const DE_DATE_PATTERN = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export function parseGermanDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || text === "—") return null;

  const de = text.match(DE_DATE_PATTERN);
  if (de) {
    const day = Number(de[1]);
    const month = Number(de[2]);
    const year = Number(de[3]);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
    return null;
  }

  const iso = text.match(ISO_DATE_PATTERN);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
    return null;
  }

  return null;
}

export function formatGermanDate(value: unknown): string {
  const date = value instanceof Date ? value : parseGermanDate(value);
  if (!date) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/** Gültiges TT.MM.JJJJ oder null */
export function normalizeGermanDate(value: unknown): string | null {
  const formatted = formatGermanDate(value);
  if (!formatted) return null;
  return /^(\d{2})\.(\d{2})\.(\d{4})$/.test(formatted) ? formatted : null;
}

export function isGermanDate(value: unknown): boolean {
  return normalizeGermanDate(value) !== null;
}

export function germanToday(): string {
  return formatGermanDate(new Date());
}

/** Nur für Sortierung / Bereichsfilter (nicht in der UI anzeigen) */
export function germanDateComparable(value: unknown): string {
  const date = parseGermanDate(value);
  if (!date) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

export function compareGermanDates(a: unknown, b: unknown): number {
  return germanDateComparable(a).localeCompare(germanDateComparable(b));
}

export function isGermanDateInRange(
  value: unknown,
  fromDe: string,
  toDe: string
): boolean {
  const c = germanDateComparable(value);
  const from = germanDateComparable(fromDe);
  const to = germanDateComparable(toDe);
  if (!c || !from || !to) return false;
  return c >= from && c <= to;
}

/**
 * Wert für Supabase/Postgres speichern.
 * Standard: YYYY-MM-DD (Spalte type `date`) — UI bleibt TT.MM.JJJJ.
 * Nach dates-de-text-migration.sql: DATES_AS_DE_TEXT=true → TT.MM.JJJJ in text-Spalten.
 */
export function dateForDatabaseStorage(value: unknown): string | null {
  const de = normalizeGermanDate(value);
  if (!de) return null;
  if (process.env.DATES_AS_DE_TEXT === "true") {
    return de;
  }
  return germanDateComparable(de);
}

export function listGermanDatesInRange(fromDe: string, toDe: string): string[] {
  const from = parseGermanDate(fromDe);
  const to = parseGermanDate(toDe);
  if (!from || !to) return [];

  const dates: string[] = [];
  const cursor = new Date(from);
  const end = new Date(to);
  while (cursor <= end) {
    dates.push(formatGermanDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/** Datumsliste für DB-Abfragen (.in), passend zum Speicherformat */
export function listDatabaseDatesInRange(fromDe: string, toDe: string): string[] {
  const german = listGermanDatesInRange(fromDe, toDe);
  if (process.env.DATES_AS_DE_TEXT === "true") {
    return german;
  }
  return german
    .map((d) => germanDateComparable(d))
    .filter((d) => Boolean(d));
}
