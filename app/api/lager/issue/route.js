import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

const TEILE_TABLE = "lager_teile";
const BEWEGUNGEN_TABLE = "lager_bewegungen";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const referenz = typeof body.referenz === "string" ? body.referenz.trim() : "";
  const fromArbeitsauftrag = referenz.startsWith("Arbeitsauftrag");

  const canIssue = await currentUserHasPermission("warehouse.issue");
  const canWrite = await currentUserHasPermission("warehouse.write");
  const canMachineWrite = await currentUserHasPermission("machines.write");

  if (!canIssue && !canWrite && !(fromArbeitsauftrag && canMachineWrite)) {
    return NextResponse.json(
      {
        error:
          "Keine Berechtigung: warehouse.issue, warehouse.write oder machines.write (Arbeitsauftrag) erforderlich.",
      },
      { status: 403 }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }
  const lines = Array.isArray(body.lines) ? body.lines : [];
  const machineId = typeof body.machineId === "string" ? body.machineId : null;
  const referenzValue = referenz || null;

  if (!lines.length) {
    return NextResponse.json({ error: "Keine Teile zum Ausbuchen." }, { status: 400 });
  }

  const results = [];
  const errors = [];

  for (const line of lines) {
    const lagerTeilId = String(line.lagerTeilId ?? "").trim();
    const menge = Number(line.menge);

    if (!lagerTeilId || !Number.isFinite(menge) || menge <= 0) {
      errors.push("Ungültige Zeile: Herstellernummer / Menge fehlt.");
      continue;
    }

    const { data: teil, error: loadError } = await db
      .from(TEILE_TABLE)
      .select("*")
      .eq("id", lagerTeilId)
      .single();

    if (loadError || !teil) {
      errors.push(`${line.herstellernummer ?? lagerTeilId}: Teil nicht gefunden.`);
      continue;
    }

    const currentStock = Number(teil.lagerstand ?? 0);
    if (currentStock < menge) {
      errors.push(
        `${teil.herstellernummer}: Nicht genug Lagerstand (${currentStock} vorhanden, ${menge} angefordert).`
      );
      continue;
    }

    const newStock = currentStock - menge;
    const { error: updateError } = await db
      .from(TEILE_TABLE)
      .update({ lagerstand: newStock })
      .eq("id", lagerTeilId);

    if (updateError) {
      errors.push(`${teil.herstellernummer}: ${updateError.message}`);
      continue;
    }

    const { error: moveError } = await db.from(BEWEGUNGEN_TABLE).insert({
      lager_teil_id: lagerTeilId,
      menge,
      machine_id: machineId,
      referenz: referenzValue,
      bemerkung: typeof line.bemerkung === "string" ? line.bemerkung : null,
    });

    if (moveError) {
      await db.from(TEILE_TABLE).update({ lagerstand: currentStock }).eq("id", lagerTeilId);
      const hint = /lager_bewegungen/i.test(moveError.message)
        ? " Tabelle fehlt — supabase/lager-bewegungen.sql im SQL Editor ausführen."
        : "";
      errors.push(
        `${teil.herstellernummer}: Buchung fehlgeschlagen (${moveError.message}).${hint}`
      );
      continue;
    }

    results.push({
      lagerTeilId,
      herstellernummer: teil.herstellernummer,
      bezeichnung: teil.bezeichnung,
      lagerplatz: teil.lagerplatz,
      menge,
      lagerstand: newStock,
    });
  }

  if (!results.length) {
    return NextResponse.json(
      { error: errors.join(" ") || "Ausbuchung fehlgeschlagen." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    issued: results,
    errors,
  });
}
