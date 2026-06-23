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
};

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
};

export function userInitials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

export function mapDbUsersToUrlaubTimelineUsers(
  users: Array<{ username?: unknown; full_name?: unknown }>
): UrlaubTimelineUser[] {
  return users
    .map((user) => {
      const username = String(user.username ?? "").trim();
      if (!username) return null;
      const fullName = typeof user.full_name === "string" ? user.full_name.trim() : "";
      const displayName = fullName || username;
      return {
        username,
        displayName,
        initials: userInitials(displayName),
        blocks: [],
      };
    })
    .filter((user): user is UrlaubTimelineUser => user !== null)
    .sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "de", { sensitivity: "base" })
    );
}
