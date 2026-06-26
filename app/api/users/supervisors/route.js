import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../lib/auth/permissions";
import { listUsers } from "../../../../lib/auth/users";
import { isSupervisorPosition, supervisorUserLabel } from "../../../../lib/user-position";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { users, error } = await listUsers();
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const supervisors = (users ?? [])
    .filter((user) => user.is_active !== false && isSupervisorPosition(user.position))
    .map((user) => ({
      id: String(user.id),
      username: typeof user.username === "string" ? user.username : null,
      full_name: typeof user.full_name === "string" ? user.full_name : null,
      position: typeof user.position === "string" ? user.position : null,
      label: supervisorUserLabel({
        full_name: typeof user.full_name === "string" ? user.full_name : null,
        username: typeof user.username === "string" ? user.username : null,
      }),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "de"));

  return NextResponse.json({ supervisors });
}
