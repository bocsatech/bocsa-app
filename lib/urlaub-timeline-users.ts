import { resolveUserAnnualUrlaubDays } from "./urlaub-annual-days";

export const ANNUAL_URLAUB_DAYS = 25;

export type UrlaubBlockVariant =
  | "urlaub"
  | "urlaub-plan"
  | "zeitausgleich"
  | "sonderurlaub"
  | "krankenstand"
  | "pflegeurlaub";

export type UrlaubBlock = {
  startKey: string;
  endKey: string;
  label: string;
  variant: UrlaubBlockVariant;
  /** 0.5 = halber Tag, 1 = ganzer Tag (Standard) */
  portion?: 0.5 | 1;
};

export type UrlaubPortion = 0.5 | 1;

export function normalizeUrlaubPortion(value: unknown): UrlaubPortion {
  const numeric = Number(value);
  if (numeric === 0.5) return 0.5;
  return 1;
}

export function formatUrlaubQuotaValue(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(/\.0$/, "");
}

export const ABSENCE_VARIANT_LABELS: Record<UrlaubBlockVariant, string> = {
  urlaub: "Urlaub",
  "urlaub-plan": "Urlaub (Plan)",
  zeitausgleich: "Zeitausgleich",
  sonderurlaub: "Sonderurlaub",
  krankenstand: "Krankenstand",
  pflegeurlaub: "Pflegeurlaub",
};

export const APPLY_VARIANTS: UrlaubBlockVariant[] = [
  "urlaub",
  "zeitausgleich",
  "sonderurlaub",
  "krankenstand",
  "pflegeurlaub",
];

/** @deprecated */
export const CONTEXT_MENU_VARIANTS = APPLY_VARIANTS.slice(1);

export type UrlaubTimelineUser = {
  username: string;
  displayName: string;
  initials: string;
  blocks: UrlaubBlock[];
  /** Localhost: aus Admin-Feld „Urlaub“ (users.overtime_hours_balance) */
  annualDays?: number;
};

export function userInitials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

export function mapDbUsersToUrlaubTimelineUsers(
  users: Array<{ username?: unknown; full_name?: unknown; overtime_hours_balance?: unknown }>,
  options?: { usePerUserQuota?: boolean }
): UrlaubTimelineUser[] {
  const usePerUserQuota = options?.usePerUserQuota === true;

  return users
    .map((user) => {
      const username = String(user.username ?? "").trim();
      if (!username) return null;
      const fullName = typeof user.full_name === "string" ? user.full_name.trim() : "";
      const displayName = fullName || username;
      const annualDays = usePerUserQuota
        ? resolveUserAnnualUrlaubDays(user.overtime_hours_balance, true)
        : undefined;
      return {
        username,
        displayName,
        initials: userInitials(displayName),
        blocks: [],
        ...(annualDays !== undefined ? { annualDays } : {}),
      };
    })
    .filter((user): user is UrlaubTimelineUser => user !== null)
    .sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "de", { sensitivity: "base" })
    );
}

