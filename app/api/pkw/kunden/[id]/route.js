import { NextResponse } from "next/server";
import { canAccessPkwKunden } from "../../../../../lib/pkw-permissions-server.mjs";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { hashPortalPin } from "../../../../../lib/pkw-server.mjs";

const TABLE = "kunden";

export async function GET(_request, { params }) {
  if (!(await canAccessPkwKunden("read"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.kunden.read" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });

  const id = (await params).id;

  const { data: kunde, error } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!kunde) return NextResponse.json({ error: "Kunde nicht gefunden." }, { status: 404 });

  const { data: fahrzeuge } = await db
    .from("pkw_fahrzeuge")
    .select("*")
    .eq("kunde_id", id)
    .order("kennzeichen", { ascending: true });

  return NextResponse.json({
    ...kunde,
    portal_pin_set: Boolean(kunde.portal_pin_hash),
    portal_pin_hash: undefined,
    fahrzeuge: fahrzeuge ?? [],
  });
}

export async function PATCH(request, { params }) {
  if (!(await canAccessPkwKunden("write"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.kunden.write" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });

  const id = (await params).id;
  const body = await request.json().catch(() => ({}));
  const patch = { updated_at: new Date().toISOString() };

  const fields = [
    "kundennummer",
    "anrede",
    "titel",
    "vorname",
    "nachname",
    "firma",
    "email",
    "telefon",
    "mobil",
    "strasse",
    "plz",
    "ort",
    "land",
    "uid_nr",
    "notizen",
    "aktiv",
  ];

  for (const field of fields) {
    if (!(field in body)) continue;
    if (field === "aktiv") patch[field] = Boolean(body[field]);
    else if (typeof body[field] === "string") patch[field] = body[field].trim() || null;
    else patch[field] = body[field];
  }

  if (body.portal_pin) {
    const { hashPortalPin } = await import("../../../../../lib/pkw-server.mjs");
    patch.portal_pin_hash = await hashPortalPin(String(body.portal_pin));
  }

  const { data, error } = await db.from(TABLE).update(patch).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ...data,
    portal_pin_set: Boolean(data.portal_pin_hash),
    portal_pin_hash: undefined,
  });
}

export async function DELETE(_request, { params }) {
  if (!(await canAccessPkwKunden("write"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.kunden.write" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  const id = (await params).id;
  const { error } = await db.from(TABLE).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
