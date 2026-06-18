/** Server (.mjs) — Datums-Helfer (TT.MM.JJJJ), unabhängig von dates.ts */

const DE_DATE_PATTERN = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export function parseGermanDate(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || text === "—") return null;

  const de = text.match(DE_DATE_PATTERN);
  if (de) {
    const day = Number(de[1]);
    const month = Number(de[2]);
    const year = Number(de[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
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
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return date;
    }
    return null;
  }

  return null;
}

export function formatGermanDate(value) {
  const date = value instanceof Date ? value : parseGermanDate(value);
  if (!date) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function normalizeGermanDate(value) {
  const formatted = formatGermanDate(value);
  if (!formatted) return null;
  return /^(\d{2})\.(\d{2})\.(\d{4})$/.test(formatted) ? formatted : null;
}

export function germanDateComparable(value) {
  const date = parseGermanDate(value);
  if (!date) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

export function dateForDatabaseStorage(value) {
  const de = normalizeGermanDate(value);
  if (!de) return null;
  if (process.env.DATES_AS_DE_TEXT === "true") {
    return de;
  }
  return germanDateComparable(de);
}
