import { NextResponse } from "next/server";
import { canAccessPkwKunden } from "../../../../lib/pkw-permissions-server.mjs";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { buildPkwFahrzeugRow } from "../../../../lib/pkw-fahrzeug-payload.mjs";
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

  let row;
  try {
    row = {
      kennzeichen,
      ...buildPkwFahrzeugRow(body, { forInsert: true }),
      kunde_id: body.kunde_id || null,
    };
  } catch (err) {
    return NextResponse.json({ error: err.message ?? "Ungültige Eingabe." }, { status: 400 });
  }

  const { data, error } = await db.from(TABLE).insert(row).select("*").single();
  if (error) return pkwSupabaseErrorResponse(error) ?? NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
