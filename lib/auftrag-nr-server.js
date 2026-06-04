import {
  buildAuftragNrPrefix,
  buildLegacyAuftragNrPrefix,
  formatAuftragNr,
  isLegacyAuftragNr,
  isNewFormatAuftragNr,
} from "./auftrag-nr";

function counterPrefixFor(displayPrefix) {
  const prefix = String(displayPrefix ?? "").trim();
  if (/^[SCR]\d{2}\.\d{2}-[SHW]-/.test(prefix)) {
    return `${prefix}-`;
  }
  return prefix;
}

function parseSequenceFromAuftragNr(value, displayPrefix) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed.startsWith(displayPrefix)) return 0;

  const rest = trimmed.slice(displayPrefix.length);
  if (isNewFormatAuftragNr(trimmed)) {
    const match = rest.match(/^-(\d{5})$/);
    if (!match) return 0;
    const seq = Number.parseInt(match[1], 10);
    return Number.isFinite(seq) && seq > 0 ? seq : 0;
  }

  const seq = Number.parseInt(rest, 10);
  return Number.isFinite(seq) && seq > 0 ? seq : 0;
}

function maxSequenceFromValues(values, displayPrefix) {
  let max = 0;
  for (const value of values) {
    const seq = parseSequenceFromAuftragNr(value, displayPrefix);
    if (seq > max) max = seq;
  }
  return max;
}

export async function collectMaxAuftragNrSequence(
  supabase,
  displayPrefix,
  extraAuftragNrs = []
) {
  const { data, error } = await supabase
    .from("maschines")
    .select("machine_tab_data")
    .limit(5000);

  if (error) {
    throw error;
  }

  let max = maxSequenceFromValues(extraAuftragNrs, displayPrefix);
  for (const row of data ?? []) {
    const orders = row?.machine_tab_data?.work_orders;
    if (!Array.isArray(orders)) continue;
    for (const order of orders) {
      const seq = parseSequenceFromAuftragNr(order?.auftragNr, displayPrefix);
      if (seq > max) max = seq;
    }
  }

  return max;
}

export async function reserveAuftragNrViaRpc(supabase, displayPrefix) {
  const counterPrefix = counterPrefixFor(displayPrefix);
  const { data, error } = await supabase.rpc("next_arbeitsauftrag_nr", {
    p_prefix: counterPrefix,
  });

  if (error) {
    return { error, prefix: displayPrefix };
  }

  const raw = typeof data === "string" ? data : String(data ?? "");
  if (isNewFormatAuftragNr(raw)) {
    return { auftragNr: raw, prefix: displayPrefix };
  }
  if (isLegacyAuftragNr(raw)) {
    return { auftragNr: raw, prefix: displayPrefix };
  }

  return { auftragNr: raw, prefix: displayPrefix };
}

export async function reserveAuftragNrWithFallback(
  supabase,
  displayPrefix,
  extraAuftragNrs = []
) {
  const rpcResult = await reserveAuftragNrViaRpc(supabase, displayPrefix);
  if (!rpcResult.error) {
    return { auftragNr: rpcResult.auftragNr, prefix: displayPrefix, source: "rpc" };
  }

  const message = String(rpcResult.error?.message ?? "");
  const rpcUnavailable =
    message.includes("next_arbeitsauftrag_nr") ||
    message.includes("arbeitsauftrag_nr_counters") ||
    message.includes("Could not find the function");

  if (!rpcUnavailable) {
    throw rpcResult.error;
  }

  const max = await collectMaxAuftragNrSequence(
    supabase,
    displayPrefix,
    extraAuftragNrs
  );
  const next = max + 1;
  const auftragNr = /^[SCR]\d{2}\.\d{2}-[SHW]-/.test(displayPrefix)
    ? formatAuftragNr(displayPrefix, next)
    : `${displayPrefix}${String(next).padStart(5, "0")}`;

  return {
    auftragNr,
    prefix: displayPrefix,
    source: "scan",
  };
}

export async function reserveNewFormatAuftragNr(
  supabase,
  params,
  extraAuftragNrs = []
) {
  const prefix = buildAuftragNrPrefix(params);
  if (!prefix) {
    throw new Error("Auftrag-Nr.-Präfix konnte nicht erzeugt werden.");
  }
  return reserveAuftragNrWithFallback(supabase, prefix, extraAuftragNrs);
}

/** @deprecated Legacy-Backfill S05.26.S00001 */
export async function reserveLegacyAuftragNrWithFallback(
  supabase,
  type,
  depot,
  date,
  extraAuftragNrs = []
) {
  const prefix = buildLegacyAuftragNrPrefix(type, depot, date || undefined);
  return reserveAuftragNrWithFallback(supabase, prefix, extraAuftragNrs);
}