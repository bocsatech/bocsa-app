import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { normalizeBuchungRow, pkwSupabaseErrorResponse } from "../../../../../lib/pkw-server.mjs";

export async function GET(_request, { params }) {
  if (!(await currentUserHasPermission("warehouse.read"))) {
    return NextResponse.json(
      { error: "Keine Berechtigung: warehouse.read erforderlich." },
      { status: 403 }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const id = (await params).id;
  const { data, error } = await db
    .from("pkw_buchungen")
    .select(
      "*, kunde:kunden(id, vorname, nachname, firma), fahrzeug:pkw_fahrzeuge(id, marke, modell, kennzeichen, ersatzteile)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return pkwSupabaseErrorResponse(error) ?? NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Termin nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(normalizeBuchungRow(data));
}
