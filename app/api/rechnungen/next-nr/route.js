import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../lib/auth/permissions";
import { isLocalHostRequest, localhostOnlyResponse } from "../../../../lib/rechnung-local-host.mjs";
import { allocateRechnungsNr } from "../../../../lib/rechnung-server.mjs";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(request) {
  if (!isLocalHostRequest(request)) return localhostOnlyResponse();
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const belegdatum =
    new URL(request.url).searchParams.get("belegdatum")?.trim() ||
    new Date().toISOString().slice(0, 10);

  try {
    const rechnungsNr = await allocateRechnungsNr(db, belegdatum);
    return NextResponse.json({ rechnungsNr });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler." },
      { status: 500 }
    );
  }
}
