import { formatAuftragNrFromCounter } from "./work-orders";

const COUNTER_KEY = "global";

/**
 * Nächste Auftrag-Nr. aus Supabase.
 * Bevorzugt RPC next_arbeitsauftrag_nr(); Fallback: Tabelle direkt (service role).
 */
export async function allocateNextAuftragNr(db) {
  const { data: rpcData, error: rpcError } = await db.rpc("next_arbeitsauftrag_nr");

  if (!rpcError && rpcData != null) {
    const counter = typeof rpcData === "number" ? rpcData : Number(rpcData);
    if (Number.isFinite(counter) && counter >= 1) {
      return { counter, auftragNr: formatAuftragNrFromCounter(counter), error: null };
    }
  }

  const { data: existing, error: readError } = await db
    .from("arbeitsauftrag_nr_counters")
    .select("last_value")
    .eq("counter_key", COUNTER_KEY)
    .maybeSingle();

  if (readError) {
    const hint =
      rpcError?.message?.includes("does not exist") || readError.message?.includes("does not exist")
        ? "Supabase SQL: supabase/arbeitsauftrag-nr-function-only.sql ausführen."
        : undefined;
    return {
      counter: null,
      auftragNr: null,
      error: {
        message: readError.message || rpcError?.message || "Zähler nicht lesbar.",
        hint,
      },
    };
  }

  const nextCounter = Math.max(0, Number(existing?.last_value ?? 0)) + 1;
  const stamp = new Date().toISOString();

  const { error: writeError } = await db.from("arbeitsauftrag_nr_counters").upsert(
    {
      counter_key: COUNTER_KEY,
      last_value: nextCounter,
      updated_at: stamp,
    },
    { onConflict: "counter_key" }
  );

  if (writeError) {
    return {
      counter: null,
      auftragNr: null,
      error: {
        message: writeError.message,
        hint: "Tabelle arbeitsauftrag_nr_counters prüfen (counter_key, last_value).",
      },
    };
  }

  return {
    counter: nextCounter,
    auftragNr: formatAuftragNrFromCounter(nextCounter),
    error: null,
  };
}
