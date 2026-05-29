import { NextResponse } from "next/server";
import {
  currentUserCanAdminHours,
  currentUserCanReadHours,
  currentUserCanWriteHours,
  resolveHoursUsername,
} from "../../../lib/auth/hours";
import { getCurrentSession } from "../../../lib/auth/permissions";
import {
  aggregateByKey,
  buildDaySummary,
  collectProtokollEintraege,
  mapDbAbschluss,
  mapDbEintrag,
  periodRange,
  sumByQuelle,
} from "../../../lib/arbeitsstunden";
import {
  dateForDatabaseStorage,
  germanToday,
  listDatabaseDatesInRange,
  normalizeGermanDate,
} from "../../../lib/dates";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

const EINTRAEGE = "arbeitsstunden_eintraege";
const ABSCHLUSS = "arbeitsstunden_tagesabschluss";
const MACHINES = "maschines";

function isMissingHoursTablesError(error) {
  if (!error) return false;
  const code = String(error.code ?? "");
  const message = String(error.message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("arbeitsstunden_eintraege") ||
    message.includes("arbeitsstunden_tagesabschluss")
  );
}

function normalizeDatumParam(value) {
  return normalizeGermanDate(value) || "";
}

function normalizeUsername(value) {
  return String(value ?? "").trim().toLowerCase();
}

function mergeDerivedProtocolRows(existingRows, derivedRows) {
  if (!derivedRows.length) return existingRows;
  const existingProtocolKeys = new Set(
    existingRows
      .filter((row) => row.quelle === "protokoll")
      .map((row) => `${row.username}::${row.datum}::${row.workOrderId ?? ""}`)
  );
  const now = new Date().toISOString();
  const merged = [...existingRows];
  for (const draft of derivedRows) {
    const key = `${draft.username}::${draft.datum}::${draft.workOrderId ?? ""}`;
    if (existingProtocolKeys.has(key)) continue;
    merged.push({
      id: `derived-${draft.username}-${draft.datum}-${draft.workOrderId ?? Math.random().toString(36).slice(2)}`,
      username: draft.username,
      depot: draft.depot ?? "",
      datum: draft.datum,
      quelle: "protokoll",
      stunden: Number(draft.stunden ?? 0),
      beschreibung: draft.beschreibung ?? "Arbeitsauftrag",
      machineId: draft.machineId ?? null,
      workOrderId: draft.workOrderId ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }
  return merged;
}

async function loadMachines(db) {
  const { data, error } = await db.from(MACHINES).select("id, geraetenummer, depot, bezeichnung, subgroup, machine_tab_data");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function GET(request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!(await currentUserCanReadHours())) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") ?? "tag";
  const anchor =
    normalizeDatumParam(searchParams.get("datum") ?? searchParams.get("from")) ||
    germanToday();
  const isAdmin = await currentUserCanAdminHours();

  let from = normalizeDatumParam(searchParams.get("from"));
  let to = normalizeDatumParam(searchParams.get("to"));

  if (mode === "woche" || mode === "monat" || mode === "jahr") {
    const range = periodRange(mode, anchor);
    from = range.from;
    to = range.to;
  } else if (!from) {
    from = anchor;
    to = anchor;
  }
  if (!to) to = from;

  const requestedUsername = searchParams.get("username");
  const wantsAllUsers = isAdmin && !requestedUsername;
  const username = wantsAllUsers ? null : await resolveHoursUsername(requestedUsername);
  if (!wantsAllUsers && !username) {
    return NextResponse.json({ error: "Benutzer nicht erlaubt." }, { status: 403 });
  }

  const datumList = listDatabaseDatesInRange(from, to);
  let eintraegeQuery = db.from(EINTRAEGE).select("*").order("datum", { ascending: false });
  let abschlussQuery = db.from(ABSCHLUSS).select("*");
  if (datumList.length > 0) {
    eintraegeQuery = eintraegeQuery.in("datum", datumList);
    abschlussQuery = abschlussQuery.in("datum", datumList);
  }

  if (!isAdmin) {
    eintraegeQuery = eintraegeQuery.eq("username", username);
    abschlussQuery = abschlussQuery.eq("username", username);
  } else if (requestedUsername) {
    // Admin filter should be case-insensitive so names like "Thomas"/"thomas" both match.
    eintraegeQuery = eintraegeQuery.ilike("username", username);
    abschlussQuery = abschlussQuery.ilike("username", username);
  }

  const [{ data: eintraegeRows, error: e1 }, { data: abschlussRows, error: e2 }] =
    await Promise.all([eintraegeQuery, abschlussQuery]);

  if (isMissingHoursTablesError(e1) || isMissingHoursTablesError(e2)) {
    return NextResponse.json({
      error:
        "Tabelle fehlt. Bitte supabase/arbeitsstunden-zeitbuch.sql in Supabase ausführen.",
      needsMigration: true,
    }, { status: 503 });
  }
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const eintraege = (eintraegeRows ?? []).map(mapDbEintrag);
  const abschluesse = (abschlussRows ?? []).map(mapDbAbschluss);
  let effectiveEintraege = eintraege;

  if (mode === "tag" && !wantsAllUsers && username) {
    const machines = await loadMachines(db);
    const derived = collectProtokollEintraege(machines, username, from);
    effectiveEintraege = mergeDerivedProtocolRows(eintraege, derived);
  }

  if (mode === "vergleich") {
    const groupBy = searchParams.get("groupBy") === "depot" ? "depot" : "username";
    const rows = aggregateByKey(effectiveEintraege, abschluesse, from, to, groupBy);
    return NextResponse.json({ from, to, groupBy, rows });
  }

  if (mode === "liste") {
    const days = new Map();
    for (const entry of effectiveEintraege) {
      const key = `${entry.username}::${entry.datum}`;
      if (!days.has(key)) {
        const abschluss =
          abschluesse.find(
            (a) => a.username === entry.username && a.datum === entry.datum
          ) ?? null;
        days.set(
          key,
          buildDaySummary(
            effectiveEintraege,
            abschluss,
            entry.username,
            entry.datum
          )
        );
      }
    }
    for (const abschluss of abschluesse) {
      const key = `${abschluss.username}::${abschluss.datum}`;
      if (!days.has(key)) {
        days.set(
          key,
          buildDaySummary(
            effectiveEintraege,
            abschluss,
            abschluss.username,
            abschluss.datum
          )
        );
      }
    }
    const tage = [...days.values()].sort((a, b) => b.datum.localeCompare(a.datum));
    return NextResponse.json({ from, to, tage });
  }

  if (mode === "tag" && wantsAllUsers) {
    const days = new Map();
    for (const entry of effectiveEintraege) {
      const key = `${entry.username}::${entry.datum}`;
      if (!days.has(key)) {
        const abschluss =
          abschluesse.find(
            (a) => a.username === entry.username && a.datum === entry.datum
          ) ?? null;
        days.set(
          key,
          buildDaySummary(effectiveEintraege, abschluss, entry.username, entry.datum)
        );
      }
    }
    for (const abschluss of abschluesse) {
      const key = `${abschluss.username}::${abschluss.datum}`;
      if (!days.has(key)) {
        days.set(
          key,
          buildDaySummary(
            effectiveEintraege,
            abschluss,
            abschluss.username,
            abschluss.datum
          )
        );
      }
    }
    const tage = [...days.values()]
      .filter((row) => row.datum === from)
      .sort((a, b) => b.gesamtStunden - a.gesamtStunden);
    return NextResponse.json({ datum: from, from, to, tage, allUsers: true });
  }

  const normalizedTargetUsername = normalizeUsername(username);
  const resolvedUsername =
    effectiveEintraege.find(
      (e) => normalizeUsername(e.username) === normalizedTargetUsername
    )?.username ??
    abschluesse.find(
      (a) => normalizeUsername(a.username) === normalizedTargetUsername
    )?.username ??
    username;
  const abschluss =
    abschluesse.find(
      (a) =>
        normalizeUsername(a.username) === normalizeUsername(resolvedUsername) &&
        a.datum === from
    ) ?? null;
  const dayEntries = effectiveEintraege.filter(
    (e) =>
      normalizeUsername(e.username) === normalizeUsername(resolvedUsername) &&
      e.datum === from
  );
  const summary = buildDaySummary(
    effectiveEintraege,
    abschluss,
    resolvedUsername,
    from
  );
  const sums = sumByQuelle(dayEntries);

  return NextResponse.json({
    datum: from,
    username: resolvedUsername,
    abschluss,
    eintraege: dayEntries,
    summary,
    sums,
    from,
    to,
  });
}

export async function POST(request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!(await currentUserCanWriteHours())) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "manual");

  async function replaceUserProtocolRows(datum, username) {
    const machines = await loadMachines(db);
    const drafts = collectProtokollEintraege(machines, username, datum);

    const { error: deleteErr } = await db
      .from(EINTRAEGE)
      .delete()
      .eq("username", username)
      .eq("datum", datum)
      .eq("quelle", "protokoll");

    if (isMissingHoursTablesError(deleteErr)) {
      return { error: "Tabelle fehlt.", needsMigration: true };
    }
    if (deleteErr) return { error: deleteErr.message };

    if (drafts.length === 0) return { imported: 0, totalProtokoll: 0 };

    const toInsert = drafts.map((draft) => ({
      username: draft.username,
      depot: draft.depot,
      datum: draft.datum,
      quelle: "protokoll",
      stunden: draft.stunden,
      beschreibung: draft.beschreibung,
      machine_id: draft.machineId,
      work_order_id: draft.workOrderId,
      updated_at: new Date().toISOString(),
    }));

    const { error: insertErr } = await db.from(EINTRAEGE).insert(toInsert);
    if (insertErr) return { error: insertErr.message };
    return { imported: toInsert.length, totalProtokoll: drafts.length };
  }

  if (action === "sync") {
    const datum =
      dateForDatabaseStorage(body.datum) || dateForDatabaseStorage(germanToday());
    const username = await resolveHoursUsername(body.username);
    if (!username) {
      return NextResponse.json({ error: "Benutzer nicht erlaubt." }, { status: 403 });
    }

    const result = await replaceUserProtocolRows(datum, username);
    if (result?.needsMigration) {
      return NextResponse.json(result, { status: 503 });
    }
    if (result?.error) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json(result);
  }

  if (action === "sync_all") {
    if (!(await currentUserCanAdminHours())) {
      return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
    }
    const datum =
      dateForDatabaseStorage(body.datum) || dateForDatabaseStorage(germanToday());
    const machines = await loadMachines(db);
    const users = new Set();
    for (const draft of collectProtokollEintraege(machines, session.username, datum)) {
      users.add(draft.username);
    }
    for (const machine of machines) {
      const tab = machine.machine_tab_data ?? {};
      const list = Array.isArray(tab.work_orders) ? tab.work_orders : [];
      for (const row of list) {
        const name = String(row?.updatedBy ?? row?.createdBy ?? "").trim();
        const orderDate = dateForDatabaseStorage(String(row?.date ?? ""));
        if (name && orderDate === datum) users.add(name);
      }
    }

    let imported = 0;
    let totalProtokoll = 0;
    for (const uname of users) {
      const result = await replaceUserProtocolRows(datum, uname);
      if (result?.needsMigration) {
        return NextResponse.json(result, { status: 503 });
      }
      if (result?.error) return NextResponse.json({ error: result.error }, { status: 500 });
      imported += result.imported ?? 0;
      totalProtokoll += result.totalProtokoll ?? 0;
    }
    return NextResponse.json({ imported, totalProtokoll, users: users.size });
  }

  if (action === "confirm") {
    const datum =
      dateForDatabaseStorage(body.datum) || dateForDatabaseStorage(germanToday());
    const username = await resolveHoursUsername(body.username);
    if (!username) {
      return NextResponse.json({ error: "Benutzer nicht erlaubt." }, { status: 403 });
    }

    const row = {
      username,
      datum,
      depot: String(body.depot ?? "").trim(),
      soll_stunden: Number(body.sollStunden) || 10,
      arbeitszeit_von: String(body.arbeitszeitVon ?? "07:00"),
      arbeitszeit_bis: String(body.arbeitszeitBis ?? "17:00"),
      bestaetigt: Boolean(body.bestaetigt),
      bestaetigt_am: body.bestaetigt ? new Date().toISOString() : null,
      notiz: String(body.notiz ?? "").trim(),
    };

    const { error } = await db.from(ABSCHLUSS).upsert(row, { onConflict: "username,datum" });
    if (isMissingHoursTablesError(error)) {
      return NextResponse.json({ error: "Tabelle fehlt.", needsMigration: true }, { status: 503 });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const datum =
    dateForDatabaseStorage(body.datum) || dateForDatabaseStorage(germanToday());
  const username = await resolveHoursUsername(body.username);
  if (!username) {
    return NextResponse.json({ error: "Benutzer nicht erlaubt." }, { status: 403 });
  }

  const stunden = Number(String(body.stunden ?? "").replace(",", "."));
  if (!Number.isFinite(stunden) || stunden <= 0) {
    return NextResponse.json({ error: "Ungültige Stunden." }, { status: 400 });
  }

  const row = {
    username,
    depot: String(body.depot ?? "").trim(),
    datum,
    quelle: "manuell",
    stunden: Math.round(stunden * 100) / 100,
    beschreibung: String(body.beschreibung ?? "").trim() || "Manuell",
    machine_id: null,
    work_order_id: null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db.from(EINTRAEGE).insert(row).select("*").single();
  if (isMissingHoursTablesError(error)) {
    return NextResponse.json({ error: "Tabelle fehlt.", needsMigration: true }, { status: 503 });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ eintrag: mapDbEintrag(data) });
}
