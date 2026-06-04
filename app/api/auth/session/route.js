import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "../../../../lib/auth/constants";
import { verifySessionToken } from "../../../../lib/auth/session";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

function userCanManageUsers({ username, permissions, groups }) {
  if (typeof username === "string" && username.trim().toLowerCase() === "admin") {
    return true;
  }
  if (Array.isArray(permissions) && permissions.includes("users.write")) {
    return true;
  }
  return Array.isArray(groups) && groups.includes("Admin");
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  let permissions = [];
  let groups = [];

  if (db) {
    const { data: memberships } = await db
      .from("user_groups")
      .select("group_id")
      .eq("user_id", session.userId);

    const groupIds = (memberships ?? []).map((membership) => membership.group_id);

    if (groupIds.length > 0) {
      const { data: permissionRows } = await db
        .from("group_permissions")
        .select("permission_key")
        .in("group_id", groupIds);

      permissions = [
        ...new Set((permissionRows ?? []).map((permission) => permission.permission_key)),
      ];

      const { data: groupRows } = await db
        .from("permission_groups")
        .select("name")
        .in("id", groupIds);

      groups = [...new Set((groupRows ?? []).map((group) => group.name))];
    }

    const { data: userPermissionRows } = await db
      .from("user_permissions")
      .select("permission_key")
      .eq("user_id", session.userId);

    if (userPermissionRows?.length) {
      permissions = [
        ...new Set([
          ...permissions,
          ...userPermissionRows.map((row) => row.permission_key),
        ]),
      ];
    }
  }

  let profile = null;
  if (db) {
    const { data: userRow } = await db
      .from("users")
      .select("full_name, position, site, filiale_code, photo_url, signature_url")
      .eq("id", session.userId)
      .maybeSingle();
    if (userRow) {
      profile = {
        fullName:
          typeof userRow.full_name === "string" ? userRow.full_name : null,
        position:
          typeof userRow.position === "string" ? userRow.position : null,
        site: typeof userRow.site === "string" ? userRow.site : null,
        filialeCode:
          typeof userRow.filiale_code === "string" ? userRow.filiale_code : null,
        photoUrl:
          typeof userRow.photo_url === "string" ? userRow.photo_url : null,
        signatureUrl:
          typeof userRow.signature_url === "string" ? userRow.signature_url : null,
      };
    }
  }

  return NextResponse.json({
    user: {
      id: session.userId,
      username: session.username,
    },
    username: session.username,
    permissions,
    groups,
    profile,
    canManageUsers: userCanManageUsers({
      username: session.username,
      permissions,
      groups,
    }),
  });
}
