export type UserWorkArea = "lager" | "werkstatt";

export const USER_WORK_AREAS = [
  { value: "lager" as const, label: "Lager" },
  { value: "werkstatt" as const, label: "Werkstatt" },
];

export function normalizeUserWorkArea(value: unknown): UserWorkArea | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "lager" || normalized === "werkstatt") {
    return normalized;
  }
  return null;
}

export function userWorkAreaLabel(value: unknown) {
  const area = normalizeUserWorkArea(value);
  if (!area) return "—";
  return USER_WORK_AREAS.find((item) => item.value === area)?.label ?? area;
}

export const STAMMDATEN_USER_COLUMNS =
  "bank_account, direct_manager, work_area, overtime_hours_balance";
