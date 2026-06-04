import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  buchungRangeFilter,
  normalizeBuchungRow,
  pkwSupabaseErrorResponse,
} from "../../../../lib/pkw-server.mjs";

export async function GET(request) {
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

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const status = request.nextUrl.searchParams.get("status");

  let query = db
    .from("pkw_buchungen")
    .select(
      "*, kunde:kunden(id, vorname, nachname, firma), fahrzeug:pkw_fahrzeuge(id, marke, modell, kennzeichen, ersatzteile)"
    )
    .order("slot_start", { ascending: true });

  query = buchungRangeFilter(query, from, to);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return pkwSupabaseErrorResponse(error) ?? NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(normalizeBuchungRow));
}
