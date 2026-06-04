/** Filiale-Zuordnung pro Benutzer (Depot-Buchstabe für Auftragsnummern). */
export type UserFilialeCode = "S" | "H" | "W";

export type UserFilialeOption = {
  code: UserFilialeCode;
  label: string;
};

export const DEFAULT_USER_FILIALEN: UserFilialeOption[] = [
  { code: "S", label: "Schwechat" },
  { code: "H", label: "Horn" },
  { code: "W", label: "Wien" },
];

export function isUserFilialeCode(value: unknown): value is UserFilialeCode {
  return value === "S" || value === "H" || value === "W";
}

export function normalizeUserFilialeCode(value: unknown): UserFilialeCode | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return isUserFilialeCode(code) ? code : null;
}

export function userFilialeLabel(code: UserFilialeCode | null | undefined): string {
  if (!code) return "—";
  const match = DEFAULT_USER_FILIALEN.find((entry) => entry.code === code);
  return match ? `${match.label} (${code})` : code;
}
