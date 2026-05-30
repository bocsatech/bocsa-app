import { NextResponse } from "next/server";
import { canAccessPkwKunden } from "../../../../lib/pkw-permissions-server.mjs";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { hashPortalPin, pkwSupabaseErrorResponse } from "../../../../lib/pkw-server.mjs";

const TABLE = "kunden";

const EDITABLE = [
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

function buildPatch(body, { allowPin = false } = {}) {
  const patch = { updated_at: new Date().toISOString() };
  for (const field of EDITABLE) {
    if (!(field in body)) continue;
    const value = body[field];
    if (field === "aktiv") {
      patch[field] = Boolean(value);
    } else if (typeof value === "string") {
      patch[field] = value.trim() || (field === "nachname" ? "" : null);
    } else {
      patch[field] = value;
    }
  }
  return { patch, portalPin: allowPin && body.portal_pin ? String(body.portal_pin) : null };
}

export async function GET() {
  if (!(await canAccessPkwKunden("read"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.kunden.read" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });

  const { data, error } = await db.from(TABLE).select("*").order("nachname", { ascending: true });
  if (error) return pkwSupabaseErrorResponse(error) ?? NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map((row) => ({
      ...row,
      portal_pin_set: Boolean(row.portal_pin_hash),
      portal_pin_hash: undefined,
    }))
  );
}

export async function POST(request) {
  if (!(await canAccessPkwKunden("write"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.kunden.write" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const { patch, portalPin } = buildPatch(body, { allowPin: true });

  if (!patch.nachname && !patch.firma) {
    return NextResponse.json({ error: "Nachname oder Firma erforderlich." }, { status: 400 });
  }

  if (portalPin) {
    patch.portal_pin_hash = await hashPortalPin(portalPin);
  }

  const { data, error } = await db.from(TABLE).insert(patch).select("*").single();
  if (error) return pkwSupabaseErrorResponse(error) ?? NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ...data,
    portal_pin_set: Boolean(data.portal_pin_hash),
    portal_pin_hash: undefined,
  });
}
