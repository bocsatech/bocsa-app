import { NextResponse } from "next/server";
import { currentUserCanReadUrlaub } from "../../../../lib/auth/urlaub";
import { getCurrentSession } from "../../../../lib/auth/permissions";
import { listUsers } from "../../../../lib/auth/users";
import {
  attachBlocksToUrlaubUsers,
  isMissingUrlaubPortionColumn,
  isMissingUrlaubTablesError,
} from "../../../../lib/urlaub-db";
import { mapDbUsersToUrlaubTimelineUsers } from "../../../../lib/urlaub-timeline-users";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const TABLE = "urlaub_tage";
const SELECT_WITH_PORTION = "username, datum, variant, portion";
const SELECT_LEGACY = "username, datum, variant";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!(await currentUserCanReadUrlaub())) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const { users, error } = await listUsers();
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const baseUsers = mapDbUsersToUrlaubTimelineUsers(users ?? []);
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ users: baseUsers });
  }

  let { data, error: urlaubError } = await db.from(TABLE).select(SELECT_WITH_PORTION);
  if (urlaubError && isMissingUrlaubPortionColumn(urlaubError)) {
    ({ data, error: urlaubError } = await db.from(TABLE).select(SELECT_LEGACY));
  }
  if (urlaubError) {
    if (isMissingUrlaubTablesError(urlaubError)) {
      return NextResponse.json({
        users: baseUsers,
        warning: "Urlaub-Tabelle fehlt — supabase/urlaub-abwesenheiten.sql ausführen.",
      });
    }
    return NextResponse.json({ error: urlaubError.message }, { status: 500 });
  }

  const rows = attachBlocksToUrlaubUsers(baseUsers, data ?? []);
  return NextResponse.json({ users: rows });
}
