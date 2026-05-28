import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { SESSION_COOKIE } from "../../../../lib/auth/constants";
import { verifySessionToken } from "../../../../lib/auth/session";
import { currentUserHasPermission } from "../../../../lib/auth/permissions";
import { allocateNextAuftragNr } from "../../../../lib/arbeitsauftrag-nr-server";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session?.username) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const canWrite = await currentUserHasPermission(session.username, "machines.write");
  if (!canWrite) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const { counter, auftragNr, error } = await allocateNextAuftragNr(db);

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        hint: error.hint ?? "SQL: supabase/arbeitsauftrag-nr-function-only.sql",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ counter, auftragNr });
}
