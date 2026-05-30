import {
  GERAETENUMMER_SETTINGS_KEY,
  buildGeraetenummerPrefix,
  composeGeraetenummer,
  mergeGeraetenummerCodes,
  normalizeGeraetenummerCode,
  parseStructuredGeraetenummer,
  validateGeraetenummerPick,
} from "./geraetenummer.ts";

export {
  DEFAULT_GERAETENUMMER_CODES,
  GERAETENUMMER_SETTINGS_KEY,
  mergeGeraetenummerCodes,
  normalizeGeraetenummerCode,
  validateGeraetenummerPick,
  geraettypForKlasse,
} from "./geraetenummer.ts";

const MACHINE_TABLE = "maschines";

export async function loadGeraetenummerCodes(db) {
  const { data, error } = await db
    .from("app_settings")
    .select("value")
    .eq("key", GERAETENUMMER_SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return mergeGeraetenummerCodes(data?.value ?? null);
}

export async function saveGeraetenummerCodes(db, codes) {
  const merged = mergeGeraetenummerCodes(codes);
  const { error } = await db.from("app_settings").upsert(
    {
      key: GERAETENUMMER_SETTINGS_KEY,
      value: merged,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) {
    throw new Error(error.message);
  }

  return merged;
}

export async function addGeraetenummerCode(db, category, payload) {
  const codes = await loadGeraetenummerCodes(db);
  const code = normalizeGeraetenummerCode(payload.code);
  const label = String(payload.label ?? code).trim() || code;

  if (!code) {
    throw new Error("Code fehlt.");
  }

  if (category === "marken") {
    if (codes.marken.some((entry) => entry.code === code)) {
      throw new Error(`Marke ${code} existiert bereits.`);
    }
    codes.marken.push({ code, label });
  } else if (category === "klassen") {
    if (codes.klassen.some((entry) => entry.code === code)) {
      throw new Error(`Klasse ${code} existiert bereits.`);
    }
    const geraettyp = String(payload.geraettyp ?? label).trim() || label;
    codes.klassen.push({ code, label, geraettyp });
  } else if (category === "arten") {
    if (codes.arten.some((entry) => entry.code === code)) {
      throw new Error(`Gerätetyp ${code} existiert bereits.`);
    }
    codes.arten.push({ code, label });
  } else {
    throw new Error("Unbekannte Kategorie.");
  }

  return saveGeraetenummerCodes(db, codes);
}

export async function updateGeraetenummerCode(db, category, code, payload) {
  const codes = await loadGeraetenummerCodes(db);
  const normalizedCode = normalizeGeraetenummerCode(code);
  const label = String(payload.label ?? "").trim();

  if (!normalizedCode) {
    throw new Error("Code fehlt.");
  }
  if (!label) {
    throw new Error("Bezeichnung fehlt.");
  }

  if (category === "marken") {
    const entry = codes.marken.find((item) => item.code === normalizedCode);
    if (!entry) throw new Error(`Marke ${normalizedCode} nicht gefunden.`);
    entry.label = label;
  } else if (category === "klassen") {
    const entry = codes.klassen.find((item) => item.code === normalizedCode);
    if (!entry) throw new Error(`Klasse ${normalizedCode} nicht gefunden.`);
    entry.label = label;
    entry.geraettyp = String(payload.geraettyp ?? entry.geraettyp ?? label).trim() || label;
  } else if (category === "arten") {
    const entry = codes.arten.find((item) => item.code === normalizedCode);
    if (!entry) throw new Error(`Gerätetyp ${normalizedCode} nicht gefunden.`);
    entry.label = label;
  } else {
    throw new Error("Unbekannte Kategorie.");
  }

  return saveGeraetenummerCodes(db, codes);
}

export async function findMaxSequenceForPrefix(db, prefix) {
  const normalizedPrefix = String(prefix ?? "").trim().toUpperCase();
  if (!normalizedPrefix) return 0;

  const { data, error } = await db
    .from(MACHINE_TABLE)
    .select("geraetenummer")
    .ilike("geraetenummer", `${normalizedPrefix}-%`);

  if (error) {
    throw new Error(error.message);
  }

  let max = 0;
  for (const row of data ?? []) {
    const parsed = parseStructuredGeraetenummer(row.geraetenummer);
    if (!parsed) continue;
    const rowPrefix = buildGeraetenummerPrefix(parsed);
    if (rowPrefix !== normalizedPrefix) continue;
    max = Math.max(max, parsed.sequence);
  }

  return max;
}

export async function previewNextGeraetenummer(db, pick) {
  const prefix = buildGeraetenummerPrefix(pick);
  if (!prefix) {
    return { prefix: "", sequence: 1, geraetenummer: "" };
  }
  const max = await findMaxSequenceForPrefix(db, prefix);
  const sequence = max + 1;
  return {
    prefix,
    sequence,
    geraetenummer: composeGeraetenummer(pick, sequence),
  };
}

export async function allocateGeraetenummer(db, pick, codes) {
  const validationError = validateGeraetenummerPick(codes, pick);
  if (validationError) {
    throw new Error(validationError);
  }

  const prefix = buildGeraetenummerPrefix(pick);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const max = await findMaxSequenceForPrefix(db, prefix);
    const sequence = max + 1;
    const geraetenummer = composeGeraetenummer(pick, sequence);

    const { data: existing, error: existingError } = await db
      .from(MACHINE_TABLE)
      .select("id")
      .eq("geraetenummer", geraetenummer)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (!existing) {
      return {
        geraetenummer,
        sequence,
        geraettyp:
          codes.klassen.find(
            (entry) =>
              normalizeGeraetenummerCode(entry.code) ===
              normalizeGeraetenummerCode(pick.klasse)
          )?.geraettyp ?? null,
      };
    }
  }

  throw new Error("Gerätenummer konnte nicht eindeutig vergeben werden.");
}
