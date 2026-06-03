import { NextResponse } from "next/server";
import { canAccessPkwKunden } from "../../../../../lib/pkw-permissions-server.mjs";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { serializePkwErsatzteile } from "../../../../../lib/pkw-ersatzteile.mjs";
import { pkwSupabaseErrorResponse } from "../../../../../lib/pkw-server.mjs";

const TABLE = "pkw_gruppe_vorlagen";

function normalizeGruppeKey(value) {
  const key = String(value ?? "").trim();
  return key || "";
}

export async function GET(_request, { params }) {
  if (!(await canAccessPkwKunden("read"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.kunden.read" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  const gruppe = normalizeGruppeKey(decodeURIComponent((await params).gruppe));

  const { data, error } = await db.from(TABLE).select("*").eq("gruppe", gruppe).maybeSingle();
  if (error) return pkwSupabaseErrorResponse(error) ?? NextResponse.json({ error: error.message }, { status: 500 });

  if (!data) {
    return NextResponse.json({
      gruppe,
      bezeichnung: null,
      ersatzteile: [],
      updated_at: new Date(0).toISOString(),
    });
  }

  return NextResponse.json(data);
}

export async function PUT(request, { params }) {
  if (!(await canAccessPkwKunden("write"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.kunden.write" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  const gruppe = normalizeGruppeKey(decodeURIComponent((await params).gruppe));
  if (!gruppe) {
    return NextResponse.json({ error: "Gruppe erforderlich." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const row = {
    gruppe,
    bezeichnung: typeof body.bezeichnung === "string" ? body.bezeichnung.trim() || null : body.bezeichnung ?? null,
    ersatzteile: serializePkwErsatzteile(body.ersatzteile),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db.from(TABLE).upsert(row).select("*").single();
  if (error) return pkwSupabaseErrorResponse(error) ?? NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
