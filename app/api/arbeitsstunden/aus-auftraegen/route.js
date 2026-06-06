import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../lib/auth/permissions";
import {
  buildUserMatchKeys,
  collectAufgabenStundenFromAuftraege,
  resolveAuftragStundenRange,
} from "../../../../lib/aufgaben-arbeitsstunden";
import { germanToday } from "../../../../lib/dates";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const VALID_PERIODS = new Set(["tag", "woche", "monat", "intervall"]);

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

async function loadUserFullName(db, userId) {
  const { data } = await db
    .from("users")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  return typeof data?.full_name === "string" ? data.full_name : null;
}

export async function GET(request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const periodParam = String(searchParams.get("period") ?? "monat").trim();
  const period = VALID_PERIODS.has(periodParam) ? periodParam : "monat";
  const anchor = String(searchParams.get("anchor") ?? germanToday()).trim();
  const from = String(searchParams.get("from") ?? "").trim();
  const to = String(searchParams.get("to") ?? "").trim();
  const range = resolveAuftragStundenRange(period, anchor, from, to);

  try {
    const [machines, fahrzeuge, fullName] = await Promise.all([
      loadMachines(db),
      loadFahrzeuge(db),
      loadUserFullName(db, session.userId),
    ]);
    const userKeys = buildUserMatchKeys(session.username, fullName);
    const tage = collectAufgabenStundenFromAuftraege(machines, fahrzeuge, userKeys, range);
    const gesamtStunden = Math.round(
      tage.reduce((sum, tag) => sum + tag.gesamtStunden, 0) * 100
    ) / 100;

    return NextResponse.json({
      username: session.username,
      gesamtStunden,
      tage,
      period,
      range,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Laden fehlgeschlagen." },
      { status: 500 }
    );
  }
}
