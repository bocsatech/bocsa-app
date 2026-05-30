import { NextResponse } from "next/server";
import { getPkwPortalSession } from "../../../../../lib/auth/pkw-portal";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import {
  PKW_PLAETZE_MAX,
  countBookingsForSlot,
  findFreePlatz,
  normalizeBuchungRow,
  normalizeKennzeichen,
} from "../../../../../lib/pkw-server.mjs";

export async function POST(request) {
  const session = await getPkwPortalSession();
  if (!session) {
    return NextResponse.json({ error: "Bitte zuerst anmelden." }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const slot_start = body.slot_start;
  const slot_end = body.slot_end;

  if (!slot_start || !slot_end) {
    return NextResponse.json({ error: "Termin erforderlich." }, { status: 400 });
  }

  const booked = await countBookingsForSlot(db, slot_start);
  if (booked >= PKW_PLAETZE_MAX) {
    return NextResponse.json({ error: "Dieser Termin ist ausgebucht." }, { status: 409 });
  }

  const platz = await findFreePlatz(db, slot_start);
  const servicearten = Array.isArray(body.servicearten) ? body.servicearten : [];
  if (servicearten.length === 0 && !body.problem_text?.trim()) {
    return NextResponse.json(
      { error: "Mindestens eine Leistung oder eine Beschreibung erforderlich." },
      { status: 400 }
    );
  }

  const km = body.km_stand != null && body.km_stand !== "" ? Number(body.km_stand) : null;

  const row = {
    kunde_id: session.kundeId,
    fahrzeug_id: session.fahrzeugId,
    kennzeichen: normalizeKennzeichen(session.kennzeichen),
    km_stand: km,
    servicearten,
    problem_text: body.problem_text?.trim() || null,
    slot_start,
    slot_end,
    platz_nummer: platz,
    status: "angefragt",
    source: "portal",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db.from("pkw_buchungen").insert(row).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (km != null) {
    await db
      .from("pkw_fahrzeuge")
      .update({ km_stand: km, km_stand_at: new Date().toISOString() })
      .eq("id", session.fahrzeugId);
  }

  return NextResponse.json(normalizeBuchungRow(data));
}
