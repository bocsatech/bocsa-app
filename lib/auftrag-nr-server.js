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

function formatAuftragNrForPrefix(displayPrefix, sequence) {
  return /^[SCR]\d{2}\.\d{2}-[SHW]-/.test(displayPrefix)
    ? formatAuftragNr(displayPrefix, sequence)
    : `${displayPrefix}${String(sequence).padStart(5, "0")}`;
}

async function loadAllAuftragNrEntries(supabase) {
  const entries = [];

  const { data: machines, error: machineError } = await supabase
    .from("maschines")
    .select("id, machine_tab_data")
    .limit(5000);

  if (machineError) {
    throw machineError;
  }

  for (const row of machines ?? []) {
    const orders = row?.machine_tab_data?.work_orders;
    if (!Array.isArray(orders)) continue;
    for (const order of orders) {
      const nr = String(order?.auftragNr ?? "").trim();
      if (!nr) continue;
      entries.push({
        nr,
        machineId: row.id,
        orderId: typeof order?.id === "string" ? order.id : null,
        source: "machine",
      });
    }
  }

  const { data: pkwRows, error: pkwError } = await supabase
    .from("pkw_fahrzeuge")
    .select("id, tab_data")
    .limit(5000);

  if (!pkwError) {
    for (const row of pkwRows ?? []) {
      const orders = row?.tab_data?.work_orders;
      if (!Array.isArray(orders)) continue;
      for (const order of orders) {
        const nr = String(order?.auftragNr ?? "").trim();
        if (!nr) continue;
        entries.push({
          nr,
          fahrzeugId: row.id,
          orderId: typeof order?.id === "string" ? order.id : null,
          source: "pkw",
        });
      }
    }
  }

  return entries;
}

export function isAuftragNrTakenGlobally(entries, auftragNr, exclude = {}) {
  const needle = String(auftragNr ?? "").trim();
  if (!needle) return false;

  return entries.some((entry) => {
    if (entry.nr !== needle) return false;
    if (
      exclude.orderId &&
      entry.orderId === exclude.orderId &&
      ((exclude.machineId && entry.machineId === exclude.machineId) ||
        (exclude.fahrzeugId && entry.fahrzeugId === exclude.fahrzeugId))
    ) {
      return false;
    }
    return true;
  });
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

export async function ensureGloballyUniqueAuftragNr(
  supabase,
  auftragNr,
  displayPrefix,
  extraAuftragNrs = [],
  exclude = {}
) {
  const candidate = String(auftragNr ?? "").trim();
  if (!candidate) {
    throw new Error("Auftrag-Nr. fehlt.");
  }

  const entries = await loadAllAuftragNrEntries(supabase);
  for (const nr of extraAuftragNrs) {
    const trimmed = String(nr ?? "").trim();
    if (trimmed) entries.push({ nr: trimmed, source: "batch" });
  }

  if (!isAuftragNrTakenGlobally(entries, candidate, exclude)) {
    return candidate;
  }

  const allNrs = entries.map((entry) => entry.nr);
  let max = maxSequenceFromValues(allNrs, displayPrefix);
  for (const nr of extraAuftragNrs) {
    const seq = parseSequenceFromAuftragNr(nr, displayPrefix);
    if (seq > max) max = seq;
  }

  for (let attempt = 0; attempt < 200; attempt += 1) {
    max += 1;
    const next = formatAuftragNrForPrefix(displayPrefix, max);
    if (!isAuftragNrTakenGlobally(entries, next, exclude)) {
      return next;
    }
  }

  throw new Error("Keine freie Auftrag-Nr. gefunden.");
}

export async function validateAuftragNrGlobally(supabase, auftragNr, exclude = {}) {
  const trimmed = String(auftragNr ?? "").trim();
  if (!trimmed) {
    return { ok: false, error: "Auftrag-Nr. fehlt." };
  }
  if (!isLegacyAuftragNr(trimmed) && !isNewFormatAuftragNr(trimmed)) {
    return { ok: false, error: "Ungültiges Auftrag-Nr.-Format." };
  }

  const entries = await loadAllAuftragNrEntries(supabase);
  if (isAuftragNrTakenGlobally(entries, trimmed, exclude)) {
    return {
      ok: false,
      duplicate: true,
      error: `Auftrag-Nr. ${trimmed} ist bereits vergeben.`,
    };
  }

  return { ok: true };
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
  extraAuftragNrs = [],
  options = {}
) {
  const { ensureGlobalUnique = false, exclude = {} } = options;

  const rpcResult = await reserveAuftragNrViaRpc(supabase, displayPrefix);
  let result;
  if (!rpcResult.error) {
    result = { auftragNr: rpcResult.auftragNr, prefix: displayPrefix, source: "rpc" };
  } else {
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
    result = {
      auftragNr: formatAuftragNrForPrefix(displayPrefix, next),
      prefix: displayPrefix,
      source: "scan",
    };
  }

  if (ensureGlobalUnique) {
    result.auftragNr = await ensureGloballyUniqueAuftragNr(
      supabase,
      result.auftragNr,
      displayPrefix,
      extraAuftragNrs,
      exclude
    );
  }

  return result;
}

export async function reserveNewFormatAuftragNr(
  supabase,
  params,
  extraAuftragNrs = [],
  options = {}
) {
  const prefix = buildAuftragNrPrefix(params);
  if (!prefix) {
    throw new Error("Auftrag-Nr.-Präfix konnte nicht erzeugt werden.");
  }
  return reserveAuftragNrWithFallback(supabase, prefix, extraAuftragNrs, options);
}

/** @deprecated Legacy-Backfill S05.26.S00001 */
export async function reserveLegacyAuftragNrWithFallback(
  supabase,
  type,
  depot,
  date,
  extraAuftragNrs = [],
  options = {}
) {
  const prefix = buildLegacyAuftragNrPrefix(type, depot, date || undefined);
  return reserveAuftragNrWithFallback(supabase, prefix, extraAuftragNrs, options);
}
