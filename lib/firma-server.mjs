import {
  EMPTY_FIRMA,
  FIRMA_SETTINGS_KEY,
  normalizeFirmaData,
} from "./firma.ts";

export { EMPTY_FIRMA, FIRMA_SETTINGS_KEY, normalizeFirmaData };

export async function loadFirmaSettings(db) {
  const { data, error } = await db
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", FIRMA_SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    return { firma: null, updatedAt: null, error: error.message };
  }

  return {
    firma: normalizeFirmaData(data?.value ?? EMPTY_FIRMA),
    updatedAt: data?.updated_at ?? null,
    error: null,
  };
}

export async function saveFirmaSettings(db, firma) {
  const payload = normalizeFirmaData(firma);
  const { error } = await db.from("app_settings").upsert(
    {
      key: FIRMA_SETTINGS_KEY,
      value: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) {
    return { firma: null, error: error.message };
  }

  return { firma: payload, error: null };
}
