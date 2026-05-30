import { NextResponse } from "next/server";
import {
  PKW_PLAETZE_MAX,
  buildSlotsForDate,
  countBookingsForSlot,
} from "../../../../lib/pkw-server.mjs";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

/** Öffentlich: freie Termine für ein Datum (YYYY-MM-DD) */
export async function GET(request) {
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });

  const date = request.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Parameter date=YYYY-MM-DD erforderlich." }, { status: 400 });
  }

  const slots = buildSlotsForDate(date);
  const result = [];

  for (const slot of slots) {
    const booked = await countBookingsForSlot(db, slot.start);
    const freePlaetze = Math.max(0, PKW_PLAETZE_MAX - booked);
    result.push({
      start: slot.start,
      end: slot.end,
      label: slot.label,
      freePlaetze,
      available: freePlaetze > 0,
    });
  }

  return NextResponse.json(result);
}
