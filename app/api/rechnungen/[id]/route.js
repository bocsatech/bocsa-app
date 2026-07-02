import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../lib/auth/permissions";
import { isLocalHostRequest, localhostOnlyResponse } from "../../../../lib/rechnung-local-host.mjs";
import {
  deleteRechnungById,
  getRechnungById,
  updateRechnung,
} from "../../../../lib/rechnung-server.mjs";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(request, { params }) {
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
    const rechnung = await getRechnungById(db, (await params).id);
    if (!rechnung) {
      return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ rechnung }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler beim Laden." },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
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
    const rechnung = await updateRechnung(db, (await params).id, body, session.username);
    return NextResponse.json({ rechnung });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler beim Speichern." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
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
    await deleteRechnungById(db, (await params).id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler beim Löschen." },
      { status: 500 }
    );
  }
}
