import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../lib/auth/permissions";
import { collectAufgabenStundenFromAuftraege } from "../../../../lib/aufgaben-arbeitsstunden";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

async function loadMachines(db) {
  const { data, error } = await db
    .from("maschines")
    .select("id, geraetenummer, depot, bezeichnung, subgroup, machine_tab_data");
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function loadFahrzeuge(db) {
  const { data, error } = await db
    .from("pkw_fahrzeuge")
    .select("id, marke, modell, kennzeichen, tab_data, kunde:kunden(vorname, nachname, firma)");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  try {
    const [machines, fahrzeuge] = await Promise.all([loadMachines(db), loadFahrzeuge(db)]);
    const tage = collectAufgabenStundenFromAuftraege(
      machines,
      fahrzeuge,
      session.username
    );
    const gesamtStunden = Math.round(
      tage.reduce((sum, tag) => sum + tag.gesamtStunden, 0) * 100
    ) / 100;

    return NextResponse.json({
      username: session.username,
      gesamtStunden,
      tage,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Laden fehlgeschlagen." },
      { status: 500 }
    );
  }
}
