import { currentUserHasPermission, getCurrentSession } from "./permissions";

async function hasHoursOrMachineWrite(permissionKey: string) {
  if (await currentUserHasPermission(permissionKey)) return true;
  return currentUserHasPermission("machines.write");
}

export async function currentUserCanReadHours() {
  const session = await getCurrentSession();
  if (!session) return false;
  if (session.username.trim().toLowerCase() === "admin") return true;
  return hasHoursOrMachineWrite("hours.read");
}

export async function currentUserCanWriteHours() {
  const session = await getCurrentSession();
  if (!session) return false;
  if (session.username.trim().toLowerCase() === "admin") return true;
  return hasHoursOrMachineWrite("hours.write");
}

export async function currentUserCanAdminHours() {
  const session = await getCurrentSession();
  if (!session) return false;
  if (session.username.trim().toLowerCase() === "admin") return true;
  return currentUserHasPermission("hours.admin");
}

export async function resolveHoursUsername(requested?: string | null) {
  const session = await getCurrentSession();
  if (!session) return null;

  const requestedName = String(requested ?? "").trim();
  if (!requestedName || requestedName === session.username) {
    return session.username;
  }

  if (await currentUserCanAdminHours()) {
    return requestedName;
  }

  return null;
}
