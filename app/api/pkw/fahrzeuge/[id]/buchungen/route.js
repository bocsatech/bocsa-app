import { NextResponse } from "next/server";
import { canAccessPkwKunden } from "../../../../../../lib/pkw-permissions-server.mjs";
import { getSupabaseAdmin } from "../../../../../../lib/supabaseAdmin";
import { normalizeBuchungRow, pkwSupabaseErrorResponse } from "../../../../../../lib/pkw-server.mjs";

export async function GET(_request, { params }) {
  if (!(await canAccessPkwKunden("read"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.kunden.read" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  const fahrzeugId = (await params).id;

  const { data, error } = await db
    .from("pkw_buchungen")
    .select("*, kunde:kunden(id, vorname, nachname, firma)")
    .eq("fahrzeug_id", fahrzeugId)
    .order("slot_start", { ascending: false });

  if (error) return pkwSupabaseErrorResponse(error) ?? NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json((data ?? []).map(normalizeBuchungRow));
}
