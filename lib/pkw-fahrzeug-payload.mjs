/** PKW-Fahrzeug: API-Payload aus Request-Body (gemeinsam POST/PATCH) */

import { dateForDatabaseStorage, normalizeGermanDate } from "./dates.ts";
import { serializePkwReifenSaetze, syncLegacyReifenColumns } from "./pkw-reifen.mjs";
import { serializePkwErsatzteile } from "./pkw-ersatzteile.mjs";

const TEXT_KEYS = [
  "marke",
  "modell",
  "fin",
  "baujahr",
  "farbe",
  "kraftstoff",
  "gruppe",
  "notizen",
  "reifen_groesse",
  "reifen_profil",
  "reifen_typ",
  "reifen_depot_nr",
  "reifen_hersteller",
  "reifen_einlagerung",
];

const DATE_KEYS = ["paragraf_57a_gultig_bis"];

export function buildPkwFahrzeugRow(body, { forInsert = false } = {}) {
  const row = {};

  if (forInsert || "kunde_id" in body) row.kunde_id = body.kunde_id || null;

  for (const key of TEXT_KEYS) {
    if (forInsert || key in body) {
      row[key] = typeof body[key] === "string" ? body[key].trim() || null : body[key] ?? null;
    }
  }

  for (const key of DATE_KEYS) {
    if (!(forInsert || key in body)) continue;
    const raw = body[key];
    if (raw == null || raw === "") {
      row[key] = null;
      continue;
    }
    if (typeof raw !== "string" || !normalizeGermanDate(raw)) {
      throw new Error(`Ungültiges Datum „${raw}“. Bitte TT.MM.JJJJ verwenden.`);
    }
    row[key] = dateForDatabaseStorage(raw);
  }

  if (forInsert || "reifen" in body) {
    const reifen = serializePkwReifenSaetze(body.reifen);
    row.reifen = reifen;
    Object.assign(row, syncLegacyReifenColumns(reifen));
  }

  if (forInsert || "ersatzteile" in body) {
    row.ersatzteile = serializePkwErsatzteile(body.ersatzteile);
  }

  if (forInsert || "bild" in body) {
    row.bild = typeof body.bild === "string" ? body.bild.trim() || null : body.bild ?? null;
  }

  if (forInsert || "leistung_kw" in body) {
    row.leistung_kw =
      body.leistung_kw != null && body.leistung_kw !== "" ? Number(body.leistung_kw) : null;
  }

  if (forInsert || "km_stand" in body) {
    const hasKm = body.km_stand != null && body.km_stand !== "";
    row.km_stand = hasKm ? Number(body.km_stand) : null;
    if (hasKm) row.km_stand_at = new Date().toISOString();
  }

  if (forInsert || "aktiv" in body) {
    row.aktiv = body.aktiv !== false;
  }

  if (forInsert || "tab_data" in body) {
    row.tab_data =
      body.tab_data && typeof body.tab_data === "object" && !Array.isArray(body.tab_data)
        ? body.tab_data
        : body.tab_data ?? null;
  }

  row.updated_at = new Date().toISOString();
  return row;
}
