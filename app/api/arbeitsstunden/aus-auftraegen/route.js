import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../lib/auth/permissions";
import {
  buildUserMatchKeys,
  collectAufgabenStundenFromAuftraege,
  encodeMeineStundenManualMeta,
  mapManualDbRowToEintrag,
  mergeManualStundenIntoTage,
  resolveAuftragStundenRange,
  sumTageStunden,
} from "../../../../lib/aufgaben-arbeitsstunden";
import { parseStundenInput } from "../../../../lib/arbeitsstunden";
import {
  dateForDatabaseStorage,
  formatGermanDate,
  germanToday,
  isGermanDateInRange,
  normalizeGermanDate,
} from "../../../../lib/dates";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const VALID_PERIODS = new Set(["alle", "tag", "woche", "monat", "intervall"]);
const EINTRAEGE = "arbeitsstunden_eintraege";

function isMissingHoursTablesError(error) {
  if (!error) return false;
  const code = String(error.code ?? "");
  const message = String(error.message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("arbeitsstunden_eintraege")
  );
}

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

async function loadManualEintraege(db, username, range) {
  const { data, error } = await db
    .from(EINTRAEGE)
    .select("id, datum, stunden, depot, beschreibung, quelle")
    .eq("username", username)
    .eq("quelle", "manuell");

  if (isMissingHoursTablesError(error)) return [];
  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => mapManualDbRowToEintrag(row))
    .filter((row) => {
      if (!row) return false;
      if (!range) return true;
      return isGermanDateInRange(row.datum, range.from, range.to);
    });
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
  const periodParam = String(searchParams.get("period") ?? "alle").trim();
  const period = VALID_PERIODS.has(periodParam) ? periodParam : "alle";
  const anchor = String(searchParams.get("anchor") ?? germanToday()).trim();
  const from = String(searchParams.get("from") ?? "").trim();
  const to = String(searchParams.get("to") ?? "").trim();
  const range = resolveAuftragStundenRange(period, anchor, from, to);

  try {
    const [machines, fahrzeuge, fullName, manualEintraege] = await Promise.all([
      loadMachines(db),
      loadFahrzeuge(db),
      loadUserFullName(db, session.userId),
      loadManualEintraege(db, session.username, range),
    ]);
    const userKeys = buildUserMatchKeys(session.username, fullName);
    const auftragTage = collectAufgabenStundenFromAuftraege(
      machines,
      fahrzeuge,
      userKeys,
      range ?? undefined
    );
    const tage = mergeManualStundenIntoTage(auftragTage, manualEintraege);
    const gesamtStunden = sumTageStunden(tage);

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

export async function POST(request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const datumDe =
    normalizeGermanDate(body.datum) ||
    formatGermanDate(body.datum) ||
    germanToday();
  const datum = dateForDatabaseStorage(datumDe);
  if (!datum) {
    return NextResponse.json({ error: "Ungültiges Datum." }, { status: 400 });
  }

  const stunden = parseStundenInput(String(body.stunden ?? ""));
  if (stunden === null || stunden <= 0) {
    return NextResponse.json({ error: "Ungültige Stunden." }, { status: 400 });
  }

  const row = {
    username: session.username,
    depot: String(body.referenz ?? "").trim(),
    datum,
    quelle: "manuell",
    stunden,
    beschreibung: encodeMeineStundenManualMeta(
      String(body.auftragNr ?? ""),
      String(body.bezeichnung ?? "")
    ),
    machine_id: null,
    work_order_id: null,
    updated_at: new Date().toISOString(),
  };

  const manualId = String(body.id ?? "").trim();
  if (manualId) {
    const { data, error } = await db
      .from(EINTRAEGE)
      .update(row)
      .eq("id", manualId)
      .eq("username", session.username)
      .eq("quelle", "manuell")
      .select("id, datum, stunden, depot, beschreibung")
      .maybeSingle();

    if (isMissingHoursTablesError(error)) {
      return NextResponse.json({ error: "Tabelle fehlt." }, { status: 503 });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) {
      return NextResponse.json({ error: "Eintrag nicht gefunden." }, { status: 404 });
    }

    const eintrag = mapManualDbRowToEintrag(data);
    return NextResponse.json({ eintrag });
  }

  const { data, error } = await db.from(EINTRAEGE).insert(row).select("id, datum, stunden, depot, beschreibung").single();
  if (isMissingHoursTablesError(error)) {
    return NextResponse.json({ error: "Tabelle fehlt." }, { status: 503 });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const eintrag = mapManualDbRowToEintrag(data);
  return NextResponse.json({ eintrag });
}
