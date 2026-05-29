import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";

const TABLE = "lager_teile";

const EDITABLE_FIELDS = [
  "artikelnummer",
  "herstellernummer",
  "bezeichnung",
  "bild",
  "produktgruppe",
  "lieferant",
  "lagerort",
  "lagerplatz",
  "lagerstand",
  "listenpreis_netto",
  "listenpreis_brutto",
  "verkaufspreis",
  "bestellstatus",
  "last_inventur_at",
];

const NUMERIC_FIELDS = new Set([
  "lagerstand",
  "listenpreis_netto",
  "listenpreis_brutto",
  "verkaufspreis",
]);

function normalizeTeil(row) {
  if (!row) return row;
  return {
    ...row,
    lagerstand: row.lagerstand ?? 0,
    artikelnummer: row.artikelnummer ?? null,
    last_inventur_at: row.last_inventur_at ?? null,
  };
}

function buildPatch(body) {
  const patch = {};

  for (const field of EDITABLE_FIELDS) {
    if (!(field in body)) continue;
    const value = body[field];

    if (NUMERIC_FIELDS.has(field)) {
      if (value === null || value === "") {
        patch[field] = field === "lagerstand" ? 0 : null;
      } else {
        patch[field] = Number(value);
      }
      continue;
    }

    if (typeof value === "string") {
      patch[field] = value.trim() || null;
    } else {
      patch[field] = value;
    }
  }

  return patch;
}

export async function GET(_request, { params }) {
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

  const { id } = await params;
  const { data, error } = await db.from(TABLE).select("*").eq("id", id).single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(normalizeTeil(data));
}

export async function PATCH(request, { params }) {
  if (!(await currentUserHasPermission("warehouse.write"))) {
    return NextResponse.json(
      { error: "Keine Berechtigung: warehouse.write erforderlich." },
      { status: 403 }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const patch = buildPatch(body);

  if (patch.herstellernummer === "") {
    return NextResponse.json({ error: "Herstellernummer ist erforderlich." }, { status: 400 });
  }

  const { data, error } = await db
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    const message =
      error.code === "23505"
        ? "Diese Herstellernummer existiert bereits."
        : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json(normalizeTeil(data));
}

export async function DELETE(_request, { params }) {
  if (!(await currentUserHasPermission("warehouse.write"))) {
    return NextResponse.json(
      { error: "Keine Berechtigung: warehouse.write erforderlich." },
      { status: 403 }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const { id } = await params;
  const { error } = await db.from(TABLE).delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
