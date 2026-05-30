import { buildAuftragNrPrefix, formatAuftragNr } from "./auftrag-nr";

function parseSequenceFromAuftragNr(value, prefix) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed.startsWith(prefix)) return 0;
  const seq = Number.parseInt(trimmed.slice(prefix.length), 10);
  return Number.isFinite(seq) && seq > 0 ? seq : 0;
}

function maxSequenceFromValues(values, prefix) {
  let max = 0;
  for (const value of values) {
    const seq = parseSequenceFromAuftragNr(value, prefix);
    if (seq > max) max = seq;
  }
  return max;
}

export async function collectMaxAuftragNrSequence(supabase, prefix, extraAuftragNrs = []) {
  const { data, error } = await supabase
    .from("maschines")
    .select("machine_tab_data")
    .limit(5000);

  if (error) {
    throw error;
  }

  let max = maxSequenceFromValues(extraAuftragNrs, prefix);
  for (const row of data ?? []) {
    const orders = row?.machine_tab_data?.work_orders;
    if (!Array.isArray(orders)) continue;
    for (const order of orders) {
      const seq = parseSequenceFromAuftragNr(order?.auftragNr, prefix);
      if (seq > max) max = seq;
    }
  }

  return max;
}

export async function reserveAuftragNrViaRpc(supabase, type, depot, date) {
  const prefix = buildAuftragNrPrefix(type, depot, date || undefined);
  const { data, error } = await supabase.rpc("next_arbeitsauftrag_nr", {
    p_prefix: prefix,
  });

  if (error) {
    return { error, prefix };
  }

  const auftragNr = typeof data === "string" ? data : String(data ?? "");
  return { auftragNr, prefix };
}

export async function reserveAuftragNrWithFallback(
  supabase,
  type,
  depot,
  date,
  extraAuftragNrs = []
) {
  const prefix = buildAuftragNrPrefix(type, depot, date || undefined);

  const rpcResult = await reserveAuftragNrViaRpc(supabase, type, depot, date);
  if (!rpcResult.error) {
    return { auftragNr: rpcResult.auftragNr, prefix, source: "rpc" };
  }

  const message = String(rpcResult.error?.message ?? "");
  const rpcUnavailable =
    message.includes("next_arbeitsauftrag_nr") ||
    message.includes("arbeitsauftrag_nr_counters") ||
    message.includes("Could not find the function");

  if (!rpcUnavailable) {
    throw rpcResult.error;
  }

  const max = await collectMaxAuftragNrSequence(supabase, prefix, extraAuftragNrs);
  return {
    auftragNr: formatAuftragNr(prefix, max + 1),
    prefix,
    source: "scan",
  };
}
