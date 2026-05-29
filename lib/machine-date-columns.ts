/** DB-Spalten in maschines mit Datum als TT.MM.JJJJ (text) */
export const MACHINE_DB_DATE_COLUMNS = [
  "prufung",
  "tpg_heben_technik_7_8_gultig_bis",
  "elektro_ove_e8701_e8001_gultig_bis",
  "intern_8_11_gultig_bis",
  "paragraf_57a_gultig_bis",
  "std_zahler_getauscht_am",
  "letztes_service_am",
  "frostschutz_gepruft_am",
] as const;

/** API-Feldnamen (PATCH-Body) mit Datum */
export const MACHINE_API_DATE_FIELDS = [
  "prufung",
  "tpg_hebetechnik",
  "elektro_ove",
  "intern_8_11",
  "section_57a",
  "hour_meter_changed_at",
  "last_service_date",
  "antifreeze_checked_at",
] as const;
