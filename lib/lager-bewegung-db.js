/** Supabase insert/select — tolerates missing typ/richtung/fahrzeug_id columns and embed failures. */

const BEWEGUNG_COLUMNS_FULL =
  "id, created_at, lager_teil_id, menge, typ, richtung, machine_id, fahrzeug_id, referenz, bemerkung";

const BEWEGUNG_COLUMNS_LEGACY =
  "id, created_at, lager_teil_id, menge, machine_id, referenz, bemerkung";

const TEIL_COLUMNS_BASE = "id, herstellernummer, bezeichnung, lagerort, lagerplatz";

function isSchemaExtensionError(message) {
  return /typ|richtung|fahrzeug_id|column/i.test(String(message ?? ""));
}

function isMissingTableError(message) {
  return /lager_bewegungen|does not exist|42P01|relation/i.test(String(message ?? ""));
}

function normalizeBewegungRow(row) {
  return {
    ...row,
    typ: row.typ ?? "entnahme",
    richtung: row.richtung ?? "aus",
    fahrzeug_id: row.fahrzeug_id ?? null,
  };
}

async function attachTeile(db, rows) {
  const ids = [...new Set(rows.map((row) => row.lager_teil_id).filter(Boolean))];
  if (!ids.length) {
    return rows.map((row) => ({ ...row, teil: null }));
  }

  let teileResult = await db
    .from("lager_teile")
    .select(`${TEIL_COLUMNS_BASE}, artikelnummer`)
    .in("id", ids);

  if (teileResult.error && /artikelnummer|column/i.test(teileResult.error.message)) {
    teileResult = await db.from("lager_teile").select(TEIL_COLUMNS_BASE).in("id", ids);
  }

  if (teileResult.error) {
    return { rows: rows.map((row) => ({ ...row, teil: null })), error: teileResult.error };
  }

  const byId = new Map((teileResult.data ?? []).map((teil) => [teil.id, teil]));
  return {
    rows: rows.map((row) => ({
      ...row,
      teil: byId.get(row.lager_teil_id) ?? null,
    })),
    error: null,
  };
}

export async function queryLagerBewegungen(db, { from, to }) {
  const buildQuery = (columns) =>
    db
      .from("lager_bewegungen")
      .select(columns)
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false })
      .limit(2000);

  let result = await buildQuery(BEWEGUNG_COLUMNS_FULL);
  if (result.error && isSchemaExtensionError(result.error.message)) {
    result = await buildQuery(BEWEGUNG_COLUMNS_LEGACY);
  }

  if (result.error) {
    if (isMissingTableError(result.error.message)) {
      return {
        data: [],
        error: {
          message:
            "Tabelle lager_bewegungen fehlt — supabase/lager-bewegungen.sql und lager-bewegungen-erweiterung.sql ausführen.",
        },
      };
    }
    return { data: [], error: result.error };
  }

  const normalized = (result.data ?? []).map(normalizeBewegungRow);
  const withTeile = await attachTeile(db, normalized);
  if (withTeile.error) {
    if (withTeile.rows.length === 0) {
      return { data: [], error: withTeile.error };
    }
    return { data: withTeile.rows, error: null };
  }

  return { data: withTeile.rows, error: null };
}

export async function insertLagerBewegung(db, row) {
  const full = {
    lager_teil_id: row.lager_teil_id,
    menge: row.menge,
    machine_id: row.machine_id ?? null,
    fahrzeug_id: row.fahrzeug_id ?? null,
    typ: row.typ ?? "entnahme",
    richtung: row.richtung ?? "aus",
    referenz: row.referenz ?? null,
    bemerkung: row.bemerkung ?? null,
  };

  let { error } = await db.from("lager_bewegungen").insert(full);
  if (error && isSchemaExtensionError(error.message)) {
    const legacy = {
      lager_teil_id: full.lager_teil_id,
      menge: full.menge,
      machine_id: full.machine_id,
      referenz: full.referenz,
      bemerkung: full.bemerkung,
    };
    ({ error } = await db.from("lager_bewegungen").insert(legacy));
  }
  return { error };
}
