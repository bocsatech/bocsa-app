import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../lib/auth/permissions";
import { isLocalHostRequest, localhostOnlyResponse } from "../../../lib/rechnung-local-host.mjs";
import { insertRechnung, listRechnungen } from "../../../lib/rechnung-server.mjs";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

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

  try {
    const rechnungen = await listRechnungen(db);
    return NextResponse.json({ rechnungen }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler beim Laden." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  if (!isLocalHostRequest(request)) return localhostOnlyResponse();
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));

  try {
    const rechnung = await insertRechnung(db, body, session.username);
    return NextResponse.json({ rechnung });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fehler beim Speichern.";
    const status = message.includes("duplicate") || message.includes("unique") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
