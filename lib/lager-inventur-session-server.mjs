import { currentUserHasPermission, getCurrentSession } from "./auth/permissions.ts";
import { getSupabaseAdmin } from "./supabaseAdmin";

export const INVENTUR_SESSION_TABLE = "lager_inventur_sessions";
export const INVENTUR_SESSION_TTL_HOURS = 48;

export async function canAccessLagerInventurSession() {
  const canRead = await currentUserHasPermission("warehouse.read");
  const canIssue = await currentUserHasPermission("warehouse.issue");
  const canMachineWrite = await currentUserHasPermission("machines.write");
  return canRead || canIssue || canMachineWrite;
}

export function normalizeInventurSessionPayload(body) {
  const countsRaw = body?.counts;
  if (!countsRaw || typeof countsRaw !== "object" || Array.isArray(countsRaw)) {
    return { error: "Scan-Daten fehlen." };
  }

  const counts = {};
  for (const [key, value] of Object.entries(countsRaw)) {
    const teilId = String(key ?? "").trim();
    const menge = String(value ?? "").trim();
    if (!teilId || !menge) continue;
    const parsed = Number(menge.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { error: `Ungültige Menge für Teil ${teilId}.` };
    }
    counts[teilId] = String(parsed);
  }

  const order = Array.isArray(body?.order)
    ? body.order.map((id) => String(id).trim()).filter((id) => counts[id] !== undefined)
  : Object.keys(counts);

  if (order.length === 0) {
    return { error: "Keine gescannten Teile." };
  }

  return {
    payload: {
      order,
      counts,
    },
  };
}

export function mapInventurSessionRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    appliedAt: row.applied_at ?? null,
    createdByUsername: row.created_by_username,
    filialeCode: row.filiale_code ?? null,
    teilCount: Number(row.teil_count ?? 0),
    payload: row.payload ?? { order: [], counts: {} },
  };
}

export async function loadUserFilialeCode(session, db) {
  if (!session?.userId || !db) return null;
  const { data, error } = await db
    .from("users")
    .select("filiale_code")
    .eq("id", session.userId)
    .maybeSingle();
  if (error) return null;
  return typeof data?.filiale_code === "string" ? data.filiale_code : null;
}

export async function getInventurSessionContext() {
  const session = await getCurrentSession();
  if (!session) {
    return { error: "Nicht angemeldet.", status: 401 };
  }
  if (!(await canAccessLagerInventurSession())) {
    return {
      error:
        "Keine Berechtigung: warehouse.read, warehouse.issue oder machines.write erforderlich.",
      status: 403,
    };
  }
  const db = getSupabaseAdmin();
  if (!db) {
    return { error: "Supabase ist nicht konfiguriert.", status: 500 };
  }
  return { session, db };
}
