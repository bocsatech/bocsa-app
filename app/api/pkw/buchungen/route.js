import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { canAccessPkwService } from "../../../../lib/pkw-permissions-server.mjs";
import {
  applyBuchungErsatzteile,
  assertSlotNotInPast,
  assertSlotWithinServiceHours,
  findFreePlatz,
  normalizeBuchungRow,
  normalizeKennzeichen,
  pkwSupabaseErrorResponse,
  buchungRangeFilter,
  resolveBuchungFahrzeugLink,
} from "../../../../lib/pkw-server.mjs";

export async function GET(request) {
  if (!(await canAccessPkwService("read"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.service.read" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const status = request.nextUrl.searchParams.get("status");
  const fahrzeugId = request.nextUrl.searchParams.get("fahrzeug_id");

  let query = db
    .from("pkw_buchungen")
    .select(
      "*, kunde:kunden(id, vorname, nachname, firma), fahrzeug:pkw_fahrzeuge(id, marke, modell)"
    )
    .order("slot_start", { ascending: true });

  query = buchungRangeFilter(query, from, to);
  if (status) query = query.eq("status", status);
  if (fahrzeugId) query = query.eq("fahrzeug_id", fahrzeugId);

  const { data, error } = await query;
  if (error) return pkwSupabaseErrorResponse(error) ?? NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json((data ?? []).map(normalizeBuchungRow));
}

export async function POST(request) {
  if (!(await canAccessPkwService("write"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.service.write" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  const body = await request.json().catch(() => ({}));

  const slot_start = body.slot_start;
  const slot_end = body.slot_end || slot_start;
  if (!slot_start) {
    return NextResponse.json({ error: "slot_start erforderlich." }, { status: 400 });
  }

  try {
    assertSlotWithinServiceHours(slot_start, slot_end);
    assertSlotNotInPast(slot_start);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const platz =
    body.platz_nummer != null
      ? Number(body.platz_nummer)
      : await findFreePlatz(db, slot_start);

  let fahrzeugLink;
  try {
    fahrzeugLink = await resolveBuchungFahrzeugLink(db, {
      fahrzeug_id: body.fahrzeug_id,
      kennzeichen: body.kennzeichen,
      kunde_id: body.kunde_id,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  if (fahrzeugLink.fahrzeug_id && Array.isArray(body.ersatzteile)) {
    try {
      await applyBuchungErsatzteile(db, fahrzeugLink.fahrzeug_id, body.ersatzteile);
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  const row = {
    kunde_id: fahrzeugLink.kunde_id,
    fahrzeug_id: fahrzeugLink.fahrzeug_id,
    kennzeichen: normalizeKennzeichen(body.kennzeichen),
    km_stand: body.km_stand != null ? Number(body.km_stand) : null,
    servicearten: Array.isArray(body.servicearten) ? body.servicearten : [],
    problem_text: body.problem_text?.trim() || null,
    slot_start,
    slot_end,
    platz_nummer: platz,
    status: body.status || "bestaetigt",
    assigned_user_id: body.assigned_user_id || null,
    source: "buero",
    internal_notes: body.internal_notes?.trim() || null,
    munkafolyamat: Array.isArray(body.munkafolyamat) ? body.munkafolyamat : [],
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db.from("pkw_buchungen").insert(row).select("*").single();
  if (error) return pkwSupabaseErrorResponse(error) ?? NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(normalizeBuchungRow(data));
}
