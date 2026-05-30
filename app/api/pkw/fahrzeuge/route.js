import { NextResponse } from "next/server";
import { canAccessPkwKunden } from "../../../../lib/pkw-permissions-server.mjs";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { normalizeKennzeichen, pkwSupabaseErrorResponse } from "../../../../lib/pkw-server.mjs";

const TABLE = "pkw_fahrzeuge";

export async function GET(request) {
  if (!(await canAccessPkwKunden("read"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.kunden.read" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });

  const kundeId = request.nextUrl.searchParams.get("kunde_id");

  let query = db
    .from(TABLE)
    .select("*, kunde:kunden(id, vorname, nachname, firma, kundennummer)")
    .order("kennzeichen", { ascending: true });

  if (kundeId) query = query.eq("kunde_id", kundeId);

  const { data, error } = await query;
  if (error) return pkwSupabaseErrorResponse(error) ?? NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

export async function POST(request) {
  if (!(await canAccessPkwKunden("write"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.kunden.write" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  const body = await request.json().catch(() => ({}));
  const kennzeichen = normalizeKennzeichen(body.kennzeichen);

  if (!kennzeichen) {
    return NextResponse.json({ error: "Kennzeichen erforderlich." }, { status: 400 });
  }

  const row = {
    kunde_id: body.kunde_id || null,
    kennzeichen,
    marke: body.marke?.trim() || null,
    modell: body.modell?.trim() || null,
    fin: body.fin?.trim() || null,
    baujahr: body.baujahr?.trim() || null,
    farbe: body.farbe?.trim() || null,
    kraftstoff: body.kraftstoff?.trim() || null,
    leistung_kw: body.leistung_kw != null && body.leistung_kw !== "" ? Number(body.leistung_kw) : null,
    km_stand: body.km_stand != null && body.km_stand !== "" ? Number(body.km_stand) : null,
    km_stand_at: body.km_stand != null ? new Date().toISOString() : null,
    notizen: body.notizen?.trim() || null,
    aktiv: body.aktiv !== false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db.from(TABLE).insert(row).select("*").single();
  if (error) return pkwSupabaseErrorResponse(error) ?? NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
