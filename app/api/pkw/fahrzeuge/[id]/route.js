import { NextResponse } from "next/server";
import { canAccessPkwKunden } from "../../../../../lib/pkw-permissions-server.mjs";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { buildPkwFahrzeugRow } from "../../../../../lib/pkw-fahrzeug-payload.mjs";
import { normalizeKennzeichen, pkwSupabaseErrorResponse } from "../../../../../lib/pkw-server.mjs";

const TABLE = "pkw_fahrzeuge";

export async function GET(_request, { params }) {
  if (!(await canAccessPkwKunden("read"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.kunden.read" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  const id = (await params).id;

  const { data, error } = await db
    .from(TABLE)
    .select("*, kunde:kunden(id, vorname, nachname, firma, kundennummer)")
    .eq("id", id)
    .maybeSingle();

  if (error) return pkwSupabaseErrorResponse(error) ?? NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Fahrzeug nicht gefunden." }, { status: 404 });

  return NextResponse.json(data);
}

export async function PATCH(request, { params }) {
  if (!(await canAccessPkwKunden("write"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.kunden.write" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  const id = (await params).id;
  const body = await request.json().catch(() => ({}));
  let patch;
  try {
    patch = buildPkwFahrzeugRow(body);
  } catch (err) {
    return NextResponse.json({ error: err.message ?? "Ungültige Eingabe." }, { status: 400 });
  }

  if ("kunde_id" in body) patch.kunde_id = body.kunde_id || null;
  if ("kennzeichen" in body) patch.kennzeichen = normalizeKennzeichen(body.kennzeichen);
  if ("aktiv" in body) patch.aktiv = Boolean(body.aktiv);

  const { data, error } = await db.from(TABLE).update(patch).eq("id", id).select("*").single();
  if (error) return pkwSupabaseErrorResponse(error) ?? NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function DELETE(_request, { params }) {
  if (!(await canAccessPkwKunden("write"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.kunden.write" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  const { error } = await db.from(TABLE).delete().eq("id", (await params).id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
