import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { SESSION_COOKIE } from "../../../../lib/auth/constants";
import { verifySessionToken } from "../../../../lib/auth/session";
import { currentUserHasPermission } from "../../../../lib/auth/permissions";
import { formatAuftragNrFromCounter } from "../../../../lib/work-orders";

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

  const { data, error } = await db.rpc("next_arbeitsauftrag_nr");

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        hint: "SQL ausführen: supabase/arbeitsauftrag-nr.sql",
      },
      { status: 500 }
    );
  }

  const counter = typeof data === "number" ? data : Number(data);
  if (!Number.isFinite(counter) || counter < 1) {
    return NextResponse.json({ error: "Ungültige Auftrag-Nr. vom Server." }, { status: 500 });
  }

  return NextResponse.json({
    counter,
    auftragNr: formatAuftragNrFromCounter(counter),
  });
}
