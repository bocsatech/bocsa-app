import {
  currentUserHasPermission,
  currentUserIsInGroup,
  getCurrentSession,
} from "./auth/permissions.ts";

async function isPkwAdmin() {
  if (await currentUserIsInGroup("Admin")) return true;
  const session = await getCurrentSession();
  return (
    typeof session?.username === "string" &&
    session.username.trim().toLowerCase() === "admin"
  );
}

export async function canAccessPkwKunden(readOrWrite) {
  if (await isPkwAdmin()) return true;
  return currentUserHasPermission(`pkw.kunden.${readOrWrite}`);
}

export async function canAccessPkwService(readOrWrite) {
  if (await isPkwAdmin()) return true;
  if (await currentUserHasPermission(`pkw.service.${readOrWrite}`)) return true;
  return currentUserHasPermission(`pkw.serviz.${readOrWrite}`);
}
