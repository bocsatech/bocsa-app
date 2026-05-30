import { NextResponse } from "next/server";
import { canAccessPkwKunden } from "../../../../../lib/pkw-permissions-server.mjs";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { normalizeKennzeichen } from "../../../../../lib/pkw-server.mjs";

const TABLE = "pkw_fahrzeuge";

export async function PATCH(request, { params }) {
  if (!(await canAccessPkwKunden("write"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.kunden.write" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  const id = (await params).id;
  const body = await request.json().catch(() => ({}));
  const patch = { updated_at: new Date().toISOString() };

  if ("kunde_id" in body) patch.kunde_id = body.kunde_id || null;
  if ("kennzeichen" in body) patch.kennzeichen = normalizeKennzeichen(body.kennzeichen);
  if ("marke" in body) patch.marke = body.marke?.trim() || null;
  if ("modell" in body) patch.modell = body.modell?.trim() || null;
  if ("fin" in body) patch.fin = body.fin?.trim() || null;
  if ("baujahr" in body) patch.baujahr = body.baujahr?.trim() || null;
  if ("farbe" in body) patch.farbe = body.farbe?.trim() || null;
  if ("kraftstoff" in body) patch.kraftstoff = body.kraftstoff?.trim() || null;
  if ("leistung_kw" in body) {
    patch.leistung_kw =
      body.leistung_kw != null && body.leistung_kw !== "" ? Number(body.leistung_kw) : null;
  }
  if ("km_stand" in body) {
    patch.km_stand =
      body.km_stand != null && body.km_stand !== "" ? Number(body.km_stand) : null;
    patch.km_stand_at = new Date().toISOString();
  }
  if ("notizen" in body) patch.notizen = body.notizen?.trim() || null;
  if ("aktiv" in body) patch.aktiv = Boolean(body.aktiv);

  const { data, error } = await db.from(TABLE).update(patch).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
