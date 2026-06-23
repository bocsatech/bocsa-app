import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../lib/auth/permissions";
import { listUsers } from "../../../lib/auth/users";
import { mapDbUsersToUrlaubTimelineUsers } from "../../../lib/urlaub-timeline-users";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { users, error } = await listUsers();
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const rows = mapDbUsersToUrlaubTimelineUsers(users ?? []);
  return NextResponse.json({ users: rows });
}
