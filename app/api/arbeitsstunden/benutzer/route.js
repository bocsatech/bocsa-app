import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../lib/auth/permissions";
import { listUsers } from "../../../../lib/auth/users";

export const runtime = "nodejs";

function userLabel(user) {
  const fullName = typeof user.full_name === "string" ? user.full_name.trim() : "";
  const username = String(user.username ?? "").trim();
  return fullName || username;
}

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { users, error } = await listUsers();
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const rows = (users ?? [])
    .map((user) => {
      const username = String(user.username ?? "").trim();
      if (!username) return null;
      const fullName = typeof user.full_name === "string" ? user.full_name.trim() : "";
      return {
        username,
        fullName,
        displayName: fullName || username,
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      userLabel(a).localeCompare(userLabel(b), "de", { sensitivity: "base" })
    );

  return NextResponse.json({ users: rows });
}
