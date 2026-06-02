import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../../lib/auth/permissions";
import { countLagerBestandMeldungen } from "../../../../../lib/lager-bestand";
import { countLagerFahrzeugBedarf } from "../../../../../lib/lager-pkw-bedarf";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";

const TEILE = "lager_teile";
const BUCHUNGEN = "pkw_buchungen";
const FAHRZEUGE = "pkw_fahrzeuge";

export async function GET() {
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

  const { data: teile, error: teileError } = await db.from(TEILE).select("*");
  if (teileError) {
    return NextResponse.json({ error: teileError.message }, { status: 500 });
  }

  const { data: fahrzeuge } = await db
    .from(FAHRZEUGE)
    .select("id, kennzeichen, ersatzteile, kunde:kunden(firma, nachname)")
    .eq("aktiv", true);

  const from = new Date();
  from.setDate(from.getDate() - 14);
  const to = new Date();
  to.setDate(to.getDate() + 45);

  const { data: buchungen } = await db
    .from(BUCHUNGEN)
    .select("id, fahrzeug_id, kennzeichen, slot_start, status, source")
    .gte("slot_start", from.toISOString())
    .lte("slot_start", to.toISOString());

  const bestand = countLagerBestandMeldungen(teile ?? []);
  const fahrzeugBedarf = countLagerFahrzeugBedarf(
    teile ?? [],
    fahrzeuge ?? [],
    buchungen ?? []
  );

  return NextResponse.json({
    bestand,
    fahrzeugBedarf,
    total: bestand + fahrzeugBedarf,
  });
}
