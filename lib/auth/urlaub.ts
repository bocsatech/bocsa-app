import { getCurrentSession } from "./permissions";

export async function currentUserCanReadUrlaub() {
  const session = await getCurrentSession();
  return Boolean(session);
}

export async function currentUserCanWriteUrlaub(requestedUsername?: string | null) {
  const session = await getCurrentSession();
  if (!session) return false;

  const requested = String(requestedUsername ?? "").trim();
  if (!requested || requested === session.username) return true;

  return session.username.trim().toLowerCase() === "admin";
}

export async function resolveUrlaubWriteUsername(requested?: string | null) {
  const session = await getCurrentSession();
  if (!session) return null;

  const requestedName = String(requested ?? "").trim();
  if (!requestedName || requestedName === session.username) {
    return session.username;
  }

  if (session.username.trim().toLowerCase() === "admin") {
    return requestedName;
  }

  return null;
}
