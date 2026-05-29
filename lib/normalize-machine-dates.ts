import {
  dateForDatabaseStorage,
  formatGermanDate,
  normalizeGermanDate,
} from "./dates";
import {
  MACHINE_API_DATE_FIELDS,
  MACHINE_DB_DATE_COLUMNS,
} from "./machine-date-columns";

const DB_DATE_SET = new Set<string>(MACHINE_DB_DATE_COLUMNS);
const API_DATE_SET = new Set<string>(MACHINE_API_DATE_FIELDS);

export function formatMachineRowDates<T extends Record<string, unknown>>(row: T): T {
  const out = { ...row };
  for (const col of MACHINE_DB_DATE_COLUMNS) {
    if (out[col] != null && out[col] !== "") {
      (out as Record<string, unknown>)[col] =
        formatGermanDate(out[col]) || out[col];
    }
  }
  return out;
}

export function normalizeMachinePatchDates(
  patch: Record<string, unknown>
): { patch: Record<string, unknown>; error: string | null } {
  const next = { ...patch };
  for (const key of Object.keys(next)) {
    if (!DB_DATE_SET.has(key) && !API_DATE_SET.has(key)) continue;
    const raw = next[key];
    if (raw === null || raw === undefined || raw === "") {
      next[key] = null;
      continue;
    }
    if (typeof raw !== "string") continue;
    if (!normalizeGermanDate(raw)) {
      return {
        patch: next,
        error: `Ungültiges Datum „${raw}“. Bitte TT.MM.JJJJ verwenden (z. B. 18.05.2026).`,
      };
    }
    next[key] = dateForDatabaseStorage(raw);
  }
  return { patch: next, error: null };
}
