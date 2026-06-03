import type { PkwFahrzeugFormField } from "./pkw";

export type PkwStammdatenRow = {
  key: string;
  label: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: PkwFahrzeugFormField["inputMode"];
  type?: PkwFahrzeugFormField["type"];
};

/** Kopfzeile im Stammdaten-Tab (Kennzeichen mit Marke/Modell wie Gerätenummer/Bezeichnung). */
export const PKW_STAMMDATEN_HEAD_KEY = "kennzeichen";

/** Statuszeile am Ende (wie Gerätstatus/Meldung bei Maschinen). */
export const PKW_STAMMDATEN_STATUS_KEY = "aktiv";

export function hasPkwStammdatenValue(value: string | undefined | null) {
  return String(value ?? "").trim().length > 0;
}

export function buildPkwSubtitle(form: Record<string, string>) {
  return [form.marke, form.modell].map((part) => part?.trim()).filter(Boolean).join(" ");
}

export function buildPkwStammdatenRows(
  fields: PkwFahrzeugFormField[],
  form: Record<string, string>,
  isEditing: boolean
): PkwStammdatenRow[] {
  const rows: PkwStammdatenRow[] = fields.map((field) => ({
    key: field.key,
    label: field.label,
    value: form[field.key] ?? "",
    required: field.required,
    placeholder: field.placeholder,
    inputMode: field.inputMode,
    type: field.type,
  }));

  const hideKeys = new Set<string>();
  if (!isEditing) {
    hideKeys.add("marke");
    hideKeys.add("modell");
  }

  const filtered = rows.filter((row) => {
    if (hideKeys.has(row.key)) return false;
    if (isEditing) return true;
    if (row.key === PKW_STAMMDATEN_HEAD_KEY) return true;
    return hasPkwStammdatenValue(row.value);
  });

  const head = filtered.find((row) => row.key === PKW_STAMMDATEN_HEAD_KEY);
  const rest = filtered.filter((row) => row.key !== PKW_STAMMDATEN_HEAD_KEY);
  const ordered: PkwStammdatenRow[] = [];
  if (head) ordered.push(head);
  ordered.push(...rest);
  return ordered;
}
