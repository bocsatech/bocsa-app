/** PKW-Berechtigungen (Client + dokumentiert; Server nutzt API-Checks). */

export const PKW_PERM = {
  kundenRead: "pkw.kunden.read",
  kundenWrite: "pkw.kunden.write",
  serviceRead: "pkw.service.read",
  serviceWrite: "pkw.service.write",
} as const;

function isAdminUser(username: string | undefined, groups: string[]) {
  if (groups.includes("Admin")) return true;
  return typeof username === "string" && username.trim().toLowerCase() === "admin";
}

export function hasPkwKundenRead(
  permissions: string[],
  groups: string[],
  username?: string
) {
  return (
    isAdminUser(username, groups) ||
    permissions.includes(PKW_PERM.kundenRead)
  );
}

export function hasPkwKundenWrite(
  permissions: string[],
  groups: string[],
  username?: string
) {
  return (
    isAdminUser(username, groups) ||
    permissions.includes(PKW_PERM.kundenWrite)
  );
}

export function hasPkwServiceRead(
  permissions: string[],
  groups: string[],
  username?: string
) {
  return (
    isAdminUser(username, groups) ||
    permissions.includes(PKW_PERM.serviceRead) ||
    permissions.includes("pkw.serviz.read")
  );
}

export function hasPkwServiceWrite(
  permissions: string[],
  groups: string[],
  username?: string
) {
  return (
    isAdminUser(username, groups) ||
    permissions.includes(PKW_PERM.serviceWrite) ||
    permissions.includes("pkw.serviz.write")
  );
}
