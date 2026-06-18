export type TimelineUser = {
  username: string;
  displayName: string;
  userKeys: string[];
};

function normalizeUserKey(value: string) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildUserMatchKeys(username: string, fullName?: string | null) {
  const keys = new Set<string>();
  const userKey = normalizeUserKey(username);
  if (userKey) keys.add(userKey);
  const nameKey = normalizeUserKey(fullName ?? "");
  if (nameKey) keys.add(nameKey);
  return [...keys];
}

export function mapDbUsersToTimelineUsers(
  users: Array<{ username?: unknown; full_name?: unknown }>
): TimelineUser[] {
  return users
    .map((user) => {
      const username = String(user.username ?? "").trim();
      if (!username) return null;
      const fullName = typeof user.full_name === "string" ? user.full_name.trim() : "";
      const displayName = fullName || username;
      return {
        username,
        displayName,
        userKeys: buildUserMatchKeys(username, fullName),
      };
    })
    .filter((user): user is TimelineUser => user !== null)
    .sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "de", { sensitivity: "base" })
    );
}
