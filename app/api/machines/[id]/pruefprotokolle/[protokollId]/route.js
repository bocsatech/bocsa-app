import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../../../lib/supabaseAdmin";

const MACHINE_TABLE = "maschines";

export async function GET(_request, { params }) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { id, protokollId } = await params;
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const { data, error } = await db.from(MACHINE_TABLE).select("*").eq("id", id).single();
  if (error || !data) {
    return NextResponse.json({ error: "Maschine nicht gefunden." }, { status: 404 });
  }

  const list = data.machine_tab_data?.pruefprotokolle;
  const found = Array.isArray(list)
    ? list.find((item) => item && String(item.id) === String(protokollId))
    : null;

  if (!found) {
    return NextResponse.json({ error: "Prüfprotokoll nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(found);
}
