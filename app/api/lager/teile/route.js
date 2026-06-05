import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

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
    inventur_entwurf: row.inventur_entwurf ?? null,
    inventur_entwurf_at: row.inventur_entwurf_at ?? null,
    inventur_entwurf_by: row.inventur_entwurf_by ?? null,
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

export async function GET() {
  const canRead = await currentUserHasPermission("warehouse.read");
  const canIssue = await currentUserHasPermission("warehouse.issue");
  const canMachineWrite = await currentUserHasPermission("machines.write");

  if (!canRead && !canIssue && !canMachineWrite) {
    return NextResponse.json(
      {
        error:
          "Keine Berechtigung: warehouse.read, warehouse.issue oder machines.write erforderlich.",
      },
      { status: 403 }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const { data, error } = await db
    .from(TABLE)
    .select("*")
    .order("herstellernummer", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(normalizeTeil), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request) {
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

  const body = await request.json().catch(() => ({}));
  const patch = buildPatch(body);

  if (!patch.herstellernummer) {
    return NextResponse.json({ error: "Herstellernummer ist erforderlich." }, { status: 400 });
  }

  const { data, error } = await db.from(TABLE).insert(patch).select("*").single();

  if (error) {
    const message =
      error.code === "23505"
        ? "Diese Herstellernummer existiert bereits."
        : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json(normalizeTeil(data), { status: 201 });
}
