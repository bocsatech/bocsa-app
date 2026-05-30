import { createDefaultProtocol } from "./arbeitsauftrag-protokoll.ts";
import {
  cloneProtocolFromVorlage,
  normalizeSubgroupKey,
  protocolToStoredVorlage,
} from "./geraetgruppe-protokoll.ts";

const TABLE = "geraetgruppe_protokoll_vorlagen";
const MACHINE_TABLE = "maschines";

export function defaultStoredVorlage() {
  return protocolToStoredVorlage(createDefaultProtocol());
}

export function normalizeVorlageRow(row) {
  if (!row) return null;
  const key = normalizeSubgroupKey(row.subgroup);
  let vorlage = row.vorlage;
  if (!vorlage || typeof vorlage !== "object" || Object.keys(vorlage).length === 0) {
    vorlage = defaultStoredVorlage();
  }
  return {
    subgroup: key,
    bezeichnung: row.bezeichnung ?? null,
    vorlage,
    updated_at: row.updated_at,
    updated_by: row.updated_by ?? null,
  };
}

export async function listDistinctSubgroupsFromMachines(supabase) {
  const { data, error } = await supabase
    .from(MACHINE_TABLE)
    .select("subgroup")
    .not("subgroup", "is", null);

  if (error) return { data: [], error };

  const set = new Set();
  for (const row of data ?? []) {
    const key = normalizeSubgroupKey(row.subgroup);
    if (key) set.add(key);
  }
  return { data: [...set].sort(), error: null };
}

export async function loadVorlage(supabase, subgroupRaw) {
  const subgroup = normalizeSubgroupKey(subgroupRaw) || "ALLGEMEIN";

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("subgroup", subgroup)
    .maybeSingle();

  if (error) return { data: null, error };

  if (!data) {
    if (subgroup !== "ALLGEMEIN") {
      return loadVorlage(supabase, "ALLGEMEIN");
    }
    return {
      data: {
        subgroup: "ALLGEMEIN",
        bezeichnung: "Allgemein",
        vorlage: defaultStoredVorlage(),
        updated_at: null,
        updated_by: null,
      },
      error: null,
    };
  }

  return { data: normalizeVorlageRow(data), error: null };
}

export async function saveVorlage(supabase, subgroupRaw, body, username) {
  const subgroup = normalizeSubgroupKey(subgroupRaw);
  if (!subgroup) {
    return { data: null, error: new Error("Gerätegruppe erforderlich.") };
  }

  const vorlage =
    body.vorlage && typeof body.vorlage === "object"
      ? body.vorlage
      : defaultStoredVorlage();

  cloneProtocolFromVorlage(vorlage);

  const row = {
    subgroup,
    bezeichnung: typeof body.bezeichnung === "string" ? body.bezeichnung.trim() || null : null,
    vorlage,
    updated_at: new Date().toISOString(),
    updated_by: username ?? null,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(row, { onConflict: "subgroup" })
    .select("*")
    .single();

  if (error) return { data: null, error };
  return { data: normalizeVorlageRow(data), error: null };
}

export async function listAllVorlagen(supabase) {
  const { data, error } = await supabase.from(TABLE).select("*").order("subgroup");
  if (error) return { data: null, error };
  return {
    data: (data ?? []).map((row) => normalizeVorlageRow(row)).filter(Boolean),
    error: null,
  };
}

export function geraetgruppeTableMissingResponse(error) {
  if (!error) return null;
  const msg = String(error.message ?? error);
  if (
    error.code === "PGRST205" ||
    msg.includes("schema cache") ||
    msg.includes("Could not find the table")
  ) {
    return {
      status: 503,
      body: {
        error:
          "Tabelle geraetgruppe_protokoll_vorlagen fehlt. SQL: supabase/geraetgruppe-protokoll-vorlagen.sql ausführen.",
      },
    };
  }
  return null;
}
