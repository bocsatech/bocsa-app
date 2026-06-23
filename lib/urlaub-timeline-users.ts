import { dateKeyFromDate } from "./austria-holidays";

export type UrlaubBlock = {
  startKey: string;
  endKey: string;
  label: string;
  variant: "urlaub" | "urlaub-plan" | "status";
};

export type UrlaubTimelineUser = {
  username: string;
  displayName: string;
  initials: string;
  blocks: UrlaubBlock[];
};

function addDays(base: Date, offset: number) {
  const date = new Date(base);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

function blockRange(
  ref: Date,
  startOffset: number,
  endOffset: number,
  label: string,
  variant: UrlaubBlock["variant"]
): UrlaubBlock {
  return {
    startKey: dateKeyFromDate(addDays(ref, startOffset)),
    endKey: dateKeyFromDate(addDays(ref, endOffset)),
    label,
    variant,
  };
}

function singleDay(
  ref: Date,
  offset: number,
  label: string,
  variant: UrlaubBlock["variant"] = "status"
): UrlaubBlock {
  return blockRange(ref, offset, offset, label, variant);
}

export function userInitials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

/** Demo-Urlaubblöcke pro Benutzer (relativ zu ref). */
export function demoUrlaubBlocksForUser(username: string, ref = new Date()): UrlaubBlock[] {
  const key = username.trim().toLowerCase();

  if (key === "admin" || key.includes("bocsa")) {
    return [
      singleDay(ref, 4, "Ur 4.", "urlaub"),
      singleDay(ref, 8, "Ma"),
      singleDay(ref, 9, "Ch"),
      singleDay(ref, 10, "Er"),
      blockRange(ref, 15, 18, "Urlaub 15.–18.", "urlaub-plan"),
      blockRange(ref, 22, 23, "Urlaub 22.–23.", "urlaub"),
      singleDay(ref, 29, "Zw"),
      singleDay(ref, 33, "Ne"),
    ];
  }

  if (key === "tamas") {
    return [blockRange(ref, 12, 16, "Urlaub", "urlaub")];
  }

  if (key === "savo") {
    return [blockRange(ref, 7, 9, "Urlaub", "urlaub-plan")];
  }

  if (key === "teszt") {
    return [singleDay(ref, 14, "Te")];
  }

  if (key === "user1") {
    return [blockRange(ref, 20, 21, "Urlaub", "urlaub")];
  }

  return [];
}

export function mapDbUsersToUrlaubTimelineUsers(
  users: Array<{ username?: unknown; full_name?: unknown }>,
  ref = new Date()
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
        blocks: demoUrlaubBlocksForUser(username, ref),
      };
    })
    .filter((user): user is UrlaubTimelineUser => user !== null)
    .sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "de", { sensitivity: "base" })
    );
}
