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

  const sessionName = session.username.trim().toLowerCase();
  const requestedName = String(requested ?? "").trim().toLowerCase();
  if (!requestedName || requestedName === sessionName) {
    return sessionName;
  }

  if (sessionName === "admin") {
    return requestedName;
  }

  return null;
}
