import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./constants";
import { verifySessionToken } from "./session";
import { getSupabaseAdmin } from "../supabaseAdmin";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

export async function currentUserHasPermission(permissionKey: string) {
  const session = await getCurrentSession();
  const db = getSupabaseAdmin();

  if (!session || !db) {
    return false;
  }

  const { data: memberships, error: membershipError } = await db
    .from("user_groups")
    .select("group_id")
    .eq("user_id", session.userId);

  if (membershipError) {
    return false;
  }

  const groupIds = (memberships ?? []).map((membership) => membership.group_id);
  if (groupIds.length === 0) {
    return false;
  }

  const { data: groupPerm, error: groupError } = await db
    .from("group_permissions")
    .select("permission_key")
    .in("group_id", groupIds)
    .eq("permission_key", permissionKey)
    .limit(1);

  if (!groupError && Boolean(groupPerm?.length)) {
    return true;
  }

  const { data: userPerm, error: userError } = await db
    .from("user_permissions")
    .select("permission_key")
    .eq("user_id", session.userId)
    .eq("permission_key", permissionKey)
    .limit(1);

  return !userError && Boolean(userPerm?.length);
}

export async function currentUserCanManageUsers() {
  const session = await getCurrentSession();
  if (!session) {
    return false;
  }

  if (session.username.trim().toLowerCase() === "admin") {
    return true;
  }

  if (await currentUserHasPermission("users.write")) {
    return true;
  }

  return currentUserIsInGroup("Admin");
}

export async function currentUserIsInGroup(groupName: string) {
  const session = await getCurrentSession();
  const db = getSupabaseAdmin();

  if (!session || !db) {
    return false;
  }

  const { data, error } = await db
    .from("user_groups")
    .select("permission_groups!inner(name)")
    .eq("user_id", session.userId)
    .eq("permission_groups.name", groupName)
    .limit(1);

  return !error && Boolean(data?.length);
}
