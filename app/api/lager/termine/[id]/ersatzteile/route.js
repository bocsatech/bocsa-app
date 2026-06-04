import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../../../lib/supabaseAdmin";
import { applyBuchungErsatzteile } from "../../../../../../lib/pkw-server.mjs";

export async function PATCH(request, { params }) {
  const canWrite = await currentUserHasPermission("warehouse.write");
  const canService = await currentUserHasPermission("pkw.service.write");

  if (!canWrite && !canService) {
    return NextResponse.json(
      { error: "Keine Berechtigung: warehouse.write oder pkw.service.write erforderlich." },
      { status: 403 }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const id = (await params).id;
  const body = await request.json().catch(() => ({}));

  if (!Array.isArray(body.ersatzteile)) {
    return NextResponse.json({ error: "ersatzteile (Array) erforderlich." }, { status: 400 });
  }

  const { data: buchung, error: loadError } = await db
    .from("pkw_buchungen")
    .select("id, fahrzeug_id, kennzeichen")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }
  if (!buchung) {
    return NextResponse.json({ error: "Termin nicht gefunden." }, { status: 404 });
  }

  let fahrzeugId = buchung.fahrzeug_id;
  if (!fahrzeugId && buchung.kennzeichen) {
    const { data: fz } = await db
      .from("pkw_fahrzeuge")
      .select("id")
      .ilike("kennzeichen", buchung.kennzeichen.trim())
      .maybeSingle();
    fahrzeugId = fz?.id ?? null;
  }

  if (!fahrzeugId) {
    return NextResponse.json(
      { error: "Kein PKW-Fahrzeug zu diesem Termin — bitte zuerst unter PKW anlegen." },
      { status: 400 }
    );
  }

  try {
    await applyBuchungErsatzteile(db, fahrzeugId, body.ersatzteile);
  } catch (err) {
    return NextResponse.json({ error: err.message ?? "Speichern fehlgeschlagen." }, { status: 500 });
  }

  const { data: fahrzeug, error: fzError } = await db
    .from("pkw_fahrzeuge")
    .select("id, kennzeichen, ersatzteile")
    .eq("id", fahrzeugId)
    .single();

  if (fzError) {
    return NextResponse.json({ error: fzError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, fahrzeug_id: fahrzeugId, fahrzeug });
}
