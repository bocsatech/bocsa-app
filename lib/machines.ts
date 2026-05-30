import type { Machine } from "./types/machine";
import {
  DE_DATE_PLACEHOLDER,
  formatGermanDate,
  germanToday,
  isGermanDate,
  normalizeGermanDate,
  parseGermanDate,
} from "./dates";

export {
  DE_DATE_PLACEHOLDER,
  compareGermanDates,
  formatGermanDate,
  germanDateComparable,
  germanToday,
  isGermanDate,
  isGermanDateInRange,
  listGermanDatesInRange,
  normalizeGermanDate,
  parseGermanDate,
} from "./dates";

export const MACHINE_COLUMNS = "*";

/** Stammdaten Gerättyp — auch Maschinenliste-Filter */
export const GERAETTYP_OPTIONS = [
  "Kleingerät",
  "Großgerät",
  "Elektrogerät",
  "PKW",
] as const;

export type GeraettypOption = (typeof GERAETTYP_OPTIONS)[number];

export const MACHINE_FORM_FIELDS: Array<{
  key: keyof Omit<Machine, "id" | "created_at">;
  label: string;
  type?: "text" | "number" | "date";
}> = [
  { key: "status", label: "Status" },
  { key: "prufung", label: "Prüfung", type: "date" },
  { key: "geraetenummer", label: "Gerätenummer" },
  { key: "geraettyp", label: "Gerättyp" },
  { key: "bezeichnung", label: "Bezeichnung" },
  { key: "subgroup", label: "Gerätegruppe" },
  { key: "serial_number", label: "Seriennummer" },
  { key: "depot", label: "Depot" },
  { key: "km_stand", label: "KM-Stand" },
  { key: "meldung_status", label: "Meldung" },
  { key: "baujahr", label: "Baujahr" },
  { key: "hour_meter_reading", label: "Stundenzählerstand", type: "number" },
  { key: "elektro_ove", label: "Elektro ÖVE E8701/E8001 gültig bis", type: "date" },
  { key: "intern_8_11", label: "Intern §8/11 gültig bis", type: "date" },
  { key: "section_57a", label: "§57a gültig bis", type: "date" },
  { key: "license_plate", label: "Kennzeichen" },
  { key: "hour_meter_changed_at", label: "Std. Zähler getauscht am", type: "date" },
  { key: "old_hour_meter_reading", label: "Stundenzählerstand alt", type: "number" },
  { key: "last_service_date", label: "Letztes Service am", type: "date" },
  { key: "antifreeze_checked_at", label: "Frostschutz geprüft am", type: "date" },
  { key: "damage_status", label: "Gerätestatus" },
  { key: "tpg_hebetechnik", label: "TPG-Hebetechnik §7/8 gültig bis", type: "date" },
  { key: "engine_type", label: "Motortyp" },
  { key: "engine_number", label: "Motornummer" },
  { key: "engine_power_kw", label: "Motorleistung kW", type: "number" },
  { key: "emission_standard", label: "Emissionsstandard" },
  { key: "net_weight", label: "Eigengewicht", type: "number" },
  { key: "total_width", label: "Breite", type: "number" },
  { key: "total_height", label: "Höhe", type: "number" },
  { key: "total_length", label: "Länge", type: "number" },
  { key: "engine_oil_type", label: "Motoröl Typ" },
  { key: "engine_oil_capacity", label: "Motoröl Füllmenge" },
  { key: "hydraulic_oil_type", label: "Hydrauliköl Typ" },
  { key: "hydraulic_oil_capacity", label: "Hydrauliköl Füllmenge" },
];

export const STAMMDATEN_FIELDS: typeof MACHINE_FORM_FIELDS = [
  { key: "geraetenummer", label: "Gerätenummer" },
  { key: "geraettyp", label: "Gerättyp" },
  { key: "bezeichnung", label: "Bezeichnung" },
  { key: "subgroup", label: "Gerätegruppe" },
  { key: "serial_number", label: "Seriennummer" },
  { key: "depot", label: "Depot" },
  { key: "km_stand", label: "KM-Stand" },
  { key: "meldung_status", label: "Meldung" },
  { key: "baujahr", label: "Baujahr" },
  { key: "hour_meter_reading", label: "Stundenzählerstand", type: "number" },
  { key: "elektro_ove", label: "Elektro ÖVE E8701/E8001 gültig bis", type: "date" },
  { key: "intern_8_11", label: "Intern §8/11 gültig bis", type: "date" },
  { key: "section_57a", label: "§57a gültig bis", type: "date" },
  { key: "license_plate", label: "Kennzeichen" },
  { key: "hour_meter_changed_at", label: "Std. Zähler getauscht am", type: "date" },
  { key: "old_hour_meter_reading", label: "Stundenzählerstand alt", type: "number" },
  { key: "last_service_date", label: "Letztes Service am", type: "date" },
  { key: "antifreeze_checked_at", label: "Frostschutz geprüft am", type: "date" },
  { key: "damage_status", label: "Gerätstatus" },
];

export async function fetchMachines() {
  const response = await fetch(`/api/machines?ts=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      data: null,
      error: { message: result?.error ?? "Maschinen konnten nicht geladen werden." },
    };
  }

  return { data: result as Machine[], error: null };
}

export async function fetchMachineById(id: string) {
  const response = await fetch(`/api/machines/${id}?ts=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      data: null,
      error: { message: result?.error ?? "Maschine konnte nicht geladen werden." },
    };
  }

  return { data: result as Machine, error: null };
}

export function filterMachines(machines: Machine[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return machines;

  return machines.filter(
    (machine) =>
      machine.geraetenummer?.toLowerCase().includes(q) ||
      machine.bezeichnung?.toLowerCase().includes(q) ||
      machine.serial_number?.toLowerCase().includes(q) ||
      machine.subgroup?.toLowerCase().includes(q) ||
      machine.depot?.toLowerCase().includes(q) ||
      machine.id.toLowerCase().includes(q)
  );
}

export function resolveMachineFromScan(machines: Machine[], scanned: string) {
  const raw = scanned.trim();
  if (!raw) return null;

  const idFromUrl =
    raw.match(/maschinen\/([a-f0-9-]{36})/i)?.[1] ??
    raw.match(/[?&]id=([a-f0-9-]{36})/i)?.[1];

  if (idFromUrl) {
    return machines.find((machine) => machine.id === idFromUrl) ?? null;
  }

  if (/^[a-f0-9-]{36}$/i.test(raw)) {
    return (
      machines.find((machine) => machine.id.toLowerCase() === raw.toLowerCase()) ??
      null
    );
  }

  const lower = raw.toLowerCase();
  return (
    machines.find(
      (machine) =>
        machine.geraetenummer?.toLowerCase() === lower ||
        machine.serial_number?.toLowerCase() === lower
    ) ??
    machines.find(
      (machine) =>
        machine.geraetenummer?.toLowerCase().includes(lower) ||
        machine.bezeichnung?.toLowerCase().includes(lower) ||
        machine.serial_number?.toLowerCase().includes(lower)
    ) ??
    null
  );
}

export function formatValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  return text ? text : "—";
}

/** Nur Ziffern und Dezimaltrennzeichen (Komma/Punkt) — für Textfelder mit type number. */
export function sanitizeNumericFieldInput(value: string) {
  return value.replace(/[^\d,.]/g, "");
}

/** Leer = null (optional); sonst Zahl oder null bei ungültigem Format. */
export function parseOptionalNumber(value: string): number | null {
  const raw = value.replace(",", ".").trim();
  if (!raw) return null;
  if (!/^\d+(\.\d+)?$/.test(raw)) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Gerätenummer mit einmaligem „GE“-Präfix (für Anzeige und Druck). */
export function formatGeraetenummerDisplay(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^ge\s+/i.test(text)) return text;
  return `GE ${text}`;
}

export function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return Boolean(text) && text !== "—";
}

export function formatDate(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) {
    return formatGermanDate(value) || "—";
  }
  const text = String(value).trim();
  if (!text) return "—";
  return formatGermanDate(text) || text;
}

/** @deprecated Alias — nur TT.MM.JJJJ */
export function toAustriaDateString(value: unknown) {
  return formatGermanDate(value);
}

/** @deprecated Nur noch für Alt-Code; speichern immer normalizeGermanDate */
export function toIsoDateString(value: unknown) {
  return formatGermanDate(value);
}

/** @deprecated Alias parseGermanDate */
export function parseDateOnly(value: unknown): Date | null {
  return parseGermanDate(value);
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

/** true = noch gültig, false = abgelaufen, null = kein Datum */
export function isValidOnOrBefore(expiry: Date | null, reference = new Date()) {
  if (!expiry) return null;
  return startOfDay(reference).getTime() <= startOfDay(expiry).getTime();
}

export function getServiceValidUntil(lastServiceDate: unknown) {
  const serviceDate = parseDateOnly(lastServiceDate);
  if (!serviceDate) return null;
  return addYears(serviceDate, 1);
}

export type MachineRecord = Machine & Record<string, unknown>;

export function getGeratstatusValue(machine: MachineRecord) {
  return (
    machine.damage_status ??
    machine.schadensmeldung_status ??
    machine.status ??
    ""
  );
}

export function getInternExpiryValue(machine: MachineRecord) {
  return machine.intern_8_11 ?? machine.intern_8_11_gultig_bis ?? null;
}

export function getLastServiceDateValue(machine: MachineRecord) {
  const direct = machine.last_service_date ?? machine.letztes_service_am;
  return hasValue(direct) ? direct : null;
}

export function getGeratstatusVariant(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "fertig") return "fertig";
  if (normalized === "in reperatur" || normalized === "in reparatur") return "repair";
  return "default";
}

export function buildSubtitle(machine: Machine) {
  return [
    machine.baujahr ? `Baujahr ${machine.baujahr}` : null,
    machine.serial_number ? `Seriennummer ${machine.serial_number}` : null,
    machine.depot ? `Depot ${machine.depot}` : null,
    machine.created_at ? `Erfasst ${formatDate(machine.created_at)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export type StammdatenField = {
  label: string;
  dbKey?: keyof Omit<Machine, "id" | "created_at">;
  type?: "text" | "number" | "date";
  value: string;
};

/** Stammdaten-Feld mit echtem Inhalt (kein Platzhalter / leeres Datum). */
export function stammdatenFieldHasContent(field: StammdatenField) {
  if (!hasValue(field.value)) return false;
  const text = String(field.value).trim();
  if (text.toUpperCase() === DE_DATE_PLACEHOLDER) return false;
  if (/^\[[^\]]+\]$/.test(text)) return false;
  return true;
}

export function machineToStammdatenFields(
  machine: Machine | null,
  fieldDefs: typeof STAMMDATEN_FIELDS = STAMMDATEN_FIELDS
): StammdatenField[] {
  return fieldDefs.map((field) => ({
    label: field.label,
    dbKey: field.key as StammdatenField["dbKey"],
    type: field.type,
    value: resolveStammdatenValue(machine, field.key, field.type),
  }));
}

function resolveStammdatenValue(
  machine: Machine | null,
  key: keyof Omit<Machine, "id" | "created_at">,
  type?: "text" | "number" | "date"
) {
  if (!machine) return "";

  if (key === "meldung_status") {
    const meldungen = machine.machine_tab_data?.meldungen;
    const count = Array.isArray(meldungen) ? meldungen.length : 0;
    return count > 0 ? "Meldung vorhanden" : "Keine Meldung";
  }

  if (key === "geraettyp") {
    const raw =
      machine.geraettyp ??
      (machine.machine_tab_data as Record<string, unknown> | null)?.geraettyp;
    return formatFormValue(raw, type);
  }

  if (key === "km_stand") {
    const raw =
      machine.km_stand ??
      (machine.machine_tab_data as Record<string, unknown> | null)?.km_stand;
    return formatFormValue(raw, type);
  }

  if (key === "arbeitsstunden") {
    const raw =
      machine.arbeitsstunden ??
      (machine.machine_tab_data as Record<string, unknown> | null)?.arbeitsstunden;
    return formatFormValue(raw, type);
  }

  return formatFormValue(machine[key], type);
}

function formatFormValue(value: unknown, type?: "text" | "number" | "date") {
  if (value === null || value === undefined) return "";
  if (type === "date") {
    return formatGermanDate(value) || "";
  }
  return String(value);
}

export async function updateMachine(
  id: string,
  patch: Partial<Omit<Machine, "id" | "created_at">>
) {
  const response = await fetch(`/api/machines/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      data: null,
      error: { message: result?.error ?? "Maschine konnte nicht gespeichert werden." },
    };
  }

  return { data: result as Machine, error: null };
}

/** Arbeitsauftrag-Munkalap: „GE 000029 — Bezeichnung“ egy sorban */
export function formatMachineGeraetenummerLine(machine: Machine | null) {
  if (!machine) return "";
  const parts = [
    formatValue(machine.geraetenummer),
    hasValue(machine.bezeichnung) ? String(machine.bezeichnung).trim() : null,
  ].filter(Boolean);
  return parts.join(" — ");
}

export const ARBEITSAUFTRAG_SHEET_SKIP_FIELDS = new Set([
  "geraetenummer",
  "bezeichnung",
]);

/** Felder für Arbeitsblatt / Bearbeiten (optional alle Zeilen, auch leer). */
export function filterArbeitsauftragSheetFields(
  fields: StammdatenField[],
  options?: { showEmpty?: boolean }
) {
  return fields.filter((field) => {
    if (field.dbKey && ARBEITSAUFTRAG_SHEET_SKIP_FIELDS.has(field.dbKey)) return false;
    if (options?.showEmpty) return true;
    return stammdatenFieldHasContent(field) || field.dbKey === "meldung_status";
  });
}

export function stammdatenStatusClassName(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "fertig") return "fertig";
  if (normalized === "in reperatur" || normalized === "in reparatur") return "repair";
  return "";
}

export function buildStammdatenPatch(
  machine: Machine,
  fields: StammdatenField[]
): Partial<Omit<Machine, "id" | "created_at">> {
  const patch: Record<string, unknown> = {};
  const tabData = {
    ...((machine.machine_tab_data as Record<string, unknown> | null) ?? {}),
  };

  for (const field of fields) {
    if (field.dbKey) {
      const value = field.value.trim();
      const normalizedValue =
        field.type === "date" ? normalizeGermanDate(value) : value;
      if (field.type === "date" && value && !normalizedValue) {
        continue;
      }
      if (field.dbKey === "meldung_status") continue;
      if (
        field.dbKey === "geraettyp" ||
        field.dbKey === "km_stand"
      ) {
        tabData[field.dbKey] = normalizedValue || null;
        continue;
      }
      if (field.dbKey === "arbeitsstunden") {
        patch.arbeitsstunden = parseOptionalNumber(normalizedValue);
        delete tabData.arbeitsstunden;
        continue;
      }
      if (field.type === "number") {
        patch[field.dbKey] = parseOptionalNumber(normalizedValue);
        continue;
      }
      if (value || field.dbKey in machine) {
        patch[field.dbKey] = normalizedValue || null;
      }
    }
  }

  patch.machine_tab_data = tabData;
  return patch as Partial<Omit<Machine, "id" | "created_at">>;
}

export async function createMachine(patch: Partial<Omit<Machine, "id" | "created_at">>) {
  const response = await fetch("/api/machines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      data: null,
      error: { message: result?.error ?? "Maschine konnte nicht erstellt werden." },
    };
  }

  return { data: result as Machine, error: null };
}
