import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { pkwSupabaseErrorResponse } from "../../../../lib/pkw-server.mjs";

export async function GET() {
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

  const { data, error } = await db
    .from("pkw_fahrzeuge")
    .select("*, kunde:kunden(id, vorname, nachname, firma, kundennummer)")
    .eq("aktiv", true)
    .order("kennzeichen", { ascending: true });

  if (error) {
    return pkwSupabaseErrorResponse(error) ?? NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
