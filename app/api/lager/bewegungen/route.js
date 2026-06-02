import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../lib/auth/permissions";
import { enrichLagerBewegungenForLinks } from "../../../../lib/lager-bewegung-resolve-server.mjs";
import { resolveLagerBewegungHref } from "../../../../lib/lager-bewegungen";
import { queryLagerBewegungen } from "../../../../lib/lager-bewegung-db";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function GET(request) {
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

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json(
      { error: "Parameter from und to (ISO-Datum) erforderlich." },
      { status: 400 }
    );
  }

  const { data, error } = await queryLagerBewegungen(db, { from, to });

  if (error) {
    const hint = /lager_bewegungen|typ|richtung|fahrzeug_id/i.test(error.message)
      ? " — supabase/lager-bewegungen.sql und lager-bewegungen-erweiterung.sql ausführen."
      : "";
    return NextResponse.json({ error: `${error.message}${hint}` }, { status: 500 });
  }

  const enriched = await enrichLagerBewegungenForLinks(db, data ?? []);

  const fahrzeugIds = [
    ...new Set(enriched.map((row) => row.fahrzeug_id).filter(Boolean)),
  ];
  const machineIds = [...new Set(enriched.map((row) => row.machine_id).filter(Boolean))];

  const fahrzeugMap = new Map();
  if (fahrzeugIds.length) {
    const { data: fahrzeuge } = await db
      .from("pkw_fahrzeuge")
      .select("id, kennzeichen")
      .in("id", fahrzeugIds);
    for (const fz of fahrzeuge ?? []) {
      fahrzeugMap.set(fz.id, fz.kennzeichen);
    }
  }

  const machineMap = new Map();
  if (machineIds.length) {
    const { data: machines } = await db
      .from("maschines")
      .select("id, geraetenummer")
      .in("id", machineIds);
    for (const m of machines ?? []) {
      machineMap.set(m.id, m.geraetenummer);
    }
  }

  const rows = enriched.map((row) => {
    const dto = {
      id: row.id,
      created_at: row.created_at,
      lager_teil_id: row.lager_teil_id,
      menge: Number(row.menge ?? 0),
      typ: row.typ ?? "entnahme",
      richtung: row.richtung ?? "aus",
      machine_id: row.machine_id ?? null,
      fahrzeug_id: row.fahrzeug_id ?? null,
      arbeitsauftrag_id: row.arbeitsauftrag_id ?? null,
      referenz: row.referenz ?? null,
      bemerkung: row.bemerkung ?? null,
      teil: row.teil ?? null,
      fahrzeug_kennzeichen: row.fahrzeug_id
        ? fahrzeugMap.get(row.fahrzeug_id) ?? null
        : null,
      machine_geraetenummer: row.machine_id
        ? machineMap.get(row.machine_id) ?? null
        : null,
    };
    return {
      ...dto,
      detail_href: resolveLagerBewegungHref(dto),
    };
  });

  return NextResponse.json(rows, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
