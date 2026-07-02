import { calcPositionNetto, renumberPositions } from "./rechnung.ts";

/** @param {import("@supabase/supabase-js").SupabaseClient} db */
export async function allocateRechnungsNr(db, belegdatum) {
  const year = String(belegdatum || new Date().toISOString().slice(0, 10)).slice(0, 4);
  const prefix = `${year}-`;

  const { data, error } = await db
    .from("rechnungen")
    .select("rechnungs_nr")
    .like("rechnungs_nr", `${prefix}%`)
    .order("rechnungs_nr", { ascending: false })
    .limit(1);

  if (error) throw error;

  let seq = 1;
  const last = data?.[0]?.rechnungs_nr;
  if (last && last.startsWith(prefix)) {
    const tail = Number.parseInt(last.slice(prefix.length), 10);
    if (Number.isFinite(tail)) seq = tail + 1;
  }

  return `${prefix}${String(seq).padStart(4, "0")}`;
}

function normalizePositionRow(row, index) {
  const posTyp = row.pos_typ ?? "position";
  const menge = Number(row.menge ?? 1);
  const einzel = Number(row.einzelpreis_netto ?? 0);
  const rabatt = Number(row.rabatt_prozent ?? 0);
  return {
    position_nr: Number(row.position_nr ?? index + 1),
    pos_typ: posTyp,
    kostenart: row.kostenart ?? null,
    menge,
    einheit: String(row.einheit ?? "Stk").trim() || "Stk",
    bezeichnung: String(row.bezeichnung ?? "").trim(),
    einzelpreis_netto: einzel,
    rabatt_prozent: rabatt,
    positionspreis_netto: calcPositionNetto(menge, einzel, rabatt, posTyp),
    ust_satz: Number(row.ust_satz ?? 19),
    source_type: row.source_type ?? null,
    source_ref: row.source_ref ?? null,
    lager_teil_id: row.lager_teil_id ?? null,
    sort_order: Number(row.sort_order ?? index),
  };
}

function normalizeRechnungRow(row) {
  if (!row) return row;
  return {
    ...row,
    kunde_snapshot: row.kunde_snapshot ?? {},
    fahrzeug_snapshot: row.fahrzeug_snapshot ?? null,
    machine_snapshot: row.machine_snapshot ?? null,
    kunde_bereich: row.kunde_bereich ?? "pkw",
    source_ref: row.source_ref ?? null,
    zwischensumme_netto: Number(row.zwischensumme_netto ?? 0),
    ust_19: Number(row.ust_19 ?? 0),
    ust_7: Number(row.ust_7 ?? 0),
    abzug: Number(row.abzug ?? 0),
    rechnungsbetrag: Number(row.rechnungsbetrag ?? 0),
  };
}

/** @param {import("@supabase/supabase-js").SupabaseClient} db */
export async function listRechnungen(db) {
  const { data, error } = await db
    .from("rechnungen")
    .select(
      "id, rechnungs_nr, belegdatum, faelligkeitsdatum, status, kunde_bereich, kunde_snapshot, fahrzeug_snapshot, machine_snapshot, rechnungsbetrag, bearbeiter, updated_at"
    )
    .order("belegdatum", { ascending: false })
    .order("rechnungs_nr", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeRechnungRow);
}

/** @param {import("@supabase/supabase-js").SupabaseClient} db */
export async function getRechnungById(db, id) {
  const { data, error } = await db.from("rechnungen").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: positionen, error: posError } = await db
    .from("rechnung_positionen")
    .select("*")
    .eq("rechnung_id", id)
    .order("sort_order", { ascending: true });

  if (posError) throw posError;

  return {
    ...normalizeRechnungRow(data),
    positionen: (positionen ?? []).map((row, index) => ({
      ...row,
      menge: Number(row.menge),
      einzelpreis_netto: Number(row.einzelpreis_netto),
      rabatt_prozent: Number(row.rabatt_prozent),
      positionspreis_netto: Number(row.positionspreis_netto),
      ust_satz: Number(row.ust_satz),
    })),
  };
}

/** @param {import("@supabase/supabase-js").SupabaseClient} db */
export async function insertRechnung(db, payload, username) {
  const positionen = renumberPositions(
    (payload.positionen ?? []).map((row, index) => normalizePositionRow(row, index))
  );

  const header = {
    rechnungs_nr: payload.rechnungs_nr,
    belegdatum: payload.belegdatum,
    faelligkeitsdatum: payload.faelligkeitsdatum ?? null,
    status: payload.status ?? "entwurf",
    kunde_bereich: payload.kunde_bereich ?? "pkw",
    kunde_id: payload.kunde_id ?? null,
    kunde_snapshot: payload.kunde_snapshot ?? {},
    pkw_fahrzeug_id: payload.pkw_fahrzeug_id ?? null,
    fahrzeug_snapshot: payload.fahrzeug_snapshot ?? null,
    machine_id: payload.machine_id ?? null,
    machine_snapshot: payload.machine_snapshot ?? null,
    source_type: payload.source_type ?? "manual",
    source_ref: payload.source_ref ?? null,
    mwst_modus: payload.mwst_modus ?? "zuzueglich",
    leistungsdatum: payload.leistungsdatum ?? null,
    bestellnr: payload.bestellnr ?? null,
    lieferbedingung: payload.lieferbedingung ?? null,
    notiz: payload.notiz ?? null,
    zahlungshinweis: payload.zahlungshinweis ?? null,
    footer_hinweis: payload.footer_hinweis ?? null,
    zwischensumme_netto: payload.zwischensumme_netto ?? 0,
    ust_19: payload.ust_19 ?? 0,
    ust_7: payload.ust_7 ?? 0,
    abzug: payload.abzug ?? 0,
    rechnungsbetrag: payload.rechnungsbetrag ?? 0,
    bearbeiter: payload.bearbeiter ?? username ?? null,
    created_by: username ?? null,
    updated_by: username ?? null,
  };

  const { data: created, error } = await db.from("rechnungen").insert(header).select("*").single();
  if (error) throw error;

  if (positionen.length > 0) {
    const rows = positionen.map((row) => ({
      rechnung_id: created.id,
      position_nr: row.position_nr,
      pos_typ: row.pos_typ,
      kostenart: row.kostenart,
      menge: row.menge,
      einheit: row.einheit,
      bezeichnung: row.bezeichnung,
      einzelpreis_netto: row.einzelpreis_netto,
      rabatt_prozent: row.rabatt_prozent,
      positionspreis_netto: row.positionspreis_netto,
      ust_satz: row.ust_satz,
      source_type: row.source_type,
      source_ref: row.source_ref,
      lager_teil_id: row.lager_teil_id,
      sort_order: row.sort_order,
    }));
    const { error: posError } = await db.from("rechnung_positionen").insert(rows);
    if (posError) throw posError;
  }

  return getRechnungById(db, created.id);
}

/** @param {import("@supabase/supabase-js").SupabaseClient} db */
export async function updateRechnung(db, id, payload, username) {
  const positionen = renumberPositions(
    (payload.positionen ?? []).map((row, index) => normalizePositionRow(row, index))
  );

  const header = {
    rechnungs_nr: payload.rechnungs_nr,
    belegdatum: payload.belegdatum,
    faelligkeitsdatum: payload.faelligkeitsdatum ?? null,
    status: payload.status ?? "entwurf",
    kunde_bereich: payload.kunde_bereich ?? "pkw",
    kunde_id: payload.kunde_id ?? null,
    kunde_snapshot: payload.kunde_snapshot ?? {},
    pkw_fahrzeug_id: payload.pkw_fahrzeug_id ?? null,
    fahrzeug_snapshot: payload.fahrzeug_snapshot ?? null,
    machine_id: payload.machine_id ?? null,
    machine_snapshot: payload.machine_snapshot ?? null,
    source_type: payload.source_type ?? "manual",
    source_ref: payload.source_ref ?? null,
    mwst_modus: payload.mwst_modus ?? "zuzueglich",
    leistungsdatum: payload.leistungsdatum ?? null,
    bestellnr: payload.bestellnr ?? null,
    lieferbedingung: payload.lieferbedingung ?? null,
    notiz: payload.notiz ?? null,
    zahlungshinweis: payload.zahlungshinweis ?? null,
    footer_hinweis: payload.footer_hinweis ?? null,
    zwischensumme_netto: payload.zwischensumme_netto ?? 0,
    ust_19: payload.ust_19 ?? 0,
    ust_7: payload.ust_7 ?? 0,
    abzug: payload.abzug ?? 0,
    rechnungsbetrag: payload.rechnungsbetrag ?? 0,
    bearbeiter: payload.bearbeiter ?? null,
    updated_by: username ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db.from("rechnungen").update(header).eq("id", id);
  if (error) throw error;

  const { error: delError } = await db.from("rechnung_positionen").delete().eq("rechnung_id", id);
  if (delError) throw delError;

  if (positionen.length > 0) {
    const rows = positionen.map((row) => ({
      rechnung_id: id,
      position_nr: row.position_nr,
      pos_typ: row.pos_typ,
      kostenart: row.kostenart,
      menge: row.menge,
      einheit: row.einheit,
      bezeichnung: row.bezeichnung,
      einzelpreis_netto: row.einzelpreis_netto,
      rabatt_prozent: row.rabatt_prozent,
      positionspreis_netto: row.positionspreis_netto,
      ust_satz: row.ust_satz,
      source_type: row.source_type,
      source_ref: row.source_ref,
      lager_teil_id: row.lager_teil_id,
      sort_order: row.sort_order,
    }));
    const { error: posError } = await db.from("rechnung_positionen").insert(rows);
    if (posError) throw posError;
  }

  return getRechnungById(db, id);
}

/** @param {import("@supabase/supabase-js").SupabaseClient} db */
export async function deleteRechnungById(db, id) {
  const { error } = await db.from("rechnungen").delete().eq("id", id);
  if (error) throw error;
}
