/** Server: Lagerbewegungen mit fehlender Zuordnung / PKW in machine_id auflösen. */

import {
  formatWorkOrderAuftragNr,
  isWorkOrder,
  normalizeWorkOrder,
} from "./work-orders";

const ARBEITSAUFTRAG_REFERENZ = /^Arbeitsauftrag\s*:?\s*(.+)$/i;

function parseArbeitsauftragReferenz(referenz) {
  if (!referenz?.trim()) return null;
  const match = referenz.trim().match(ARBEITSAUFTRAG_REFERENZ);
  return match?.[1]?.trim() ?? null;
}

function readMachineOrders(row) {
  const tab = row?.machine_tab_data;
  if (!tab || typeof tab !== "object") return [];
  const orders = tab.work_orders;
  if (!Array.isArray(orders)) return [];
  return orders.filter(isWorkOrder).map(normalizeWorkOrder);
}

function readPkwOrders(row) {
  const tab = row?.tab_data;
  if (!tab || typeof tab !== "object") return [];
  const orders = tab.work_orders;
  if (!Array.isArray(orders)) return [];
  return orders.filter(isWorkOrder).map(normalizeWorkOrder);
}

function buildAuftragNrIndex(entries) {
  const byNr = new Map();
  for (const entry of entries) {
    const keys = new Set();
    const nr = entry.order.auftragNr?.trim();
    if (nr) keys.add(nr);
    keys.add(formatWorkOrderAuftragNr(entry.order));
    for (const key of keys) {
      if (!key || key === "—") continue;
      if (!byNr.has(key)) byNr.set(key, entry);
    }
  }
  return byNr;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} db
 * @param {Array<Record<string, unknown>>} rows
 */
export async function enrichLagerBewegungenForLinks(db, rows) {
  if (!rows.length) return rows;

  const machineIds = [
    ...new Set(rows.map((row) => row.machine_id).filter(Boolean)),
  ];
  const pkwIdSet = new Set();

  if (machineIds.length) {
    const { data: pkwRows } = await db.from("pkw_fahrzeuge").select("id").in("id", machineIds);
    for (const fz of pkwRows ?? []) {
      pkwIdSet.add(fz.id);
    }
  }

  const needsNrLookup = rows.some((row) => {
    const nr = parseArbeitsauftragReferenz(row.referenz);
    if (!nr) return false;
    return !row.arbeitsauftrag_id || (!row.machine_id && !row.fahrzeug_id);
  });

  let machineIndex = null;
  let pkwIndex = null;

  if (needsNrLookup) {
    const machineEntries = [];
    const pkwEntries = [];

    const { data: machines } = await db
      .from("maschines")
      .select("id, machine_tab_data");
    for (const machine of machines ?? []) {
      for (const order of readMachineOrders(machine)) {
        machineEntries.push({ machineId: machine.id, order });
      }
    }

    const { data: fahrzeuge } = await db.from("pkw_fahrzeuge").select("id, tab_data");
    for (const fz of fahrzeuge ?? []) {
      for (const order of readPkwOrders(fz)) {
        pkwEntries.push({ fahrzeugId: fz.id, order });
      }
    }

    machineIndex = buildAuftragNrIndex(machineEntries);
    pkwIndex = buildAuftragNrIndex(pkwEntries);
  }

  return rows.map((row) => {
    const next = { ...row };

    if (next.machine_id && pkwIdSet.has(next.machine_id) && !next.fahrzeug_id) {
      next.fahrzeug_id = next.machine_id;
      next.machine_id = null;
    }

    const nr = parseArbeitsauftragReferenz(next.referenz);
    if (nr && machineIndex && pkwIndex) {
      if (!next.arbeitsauftrag_id) {
        if (!next.machine_id) {
          const hit = machineIndex.get(nr);
          if (hit) {
            next.machine_id = hit.machineId;
            next.arbeitsauftrag_id = hit.order.id;
          }
        }
        if (!next.fahrzeug_id && !next.machine_id) {
          const hit = pkwIndex.get(nr);
          if (hit) {
            next.fahrzeug_id = hit.fahrzeugId;
            next.arbeitsauftrag_id = hit.order.id;
          }
        }
      }

      if (next.machine_id && !next.arbeitsauftrag_id && machineIndex.has(nr)) {
        const hit = machineIndex.get(nr);
        if (hit?.machineId === next.machine_id) {
          next.arbeitsauftrag_id = hit.order.id;
        }
      }

      if (next.fahrzeug_id && !next.arbeitsauftrag_id && pkwIndex.has(nr)) {
        const hit = pkwIndex.get(nr);
        if (hit?.fahrzeugId === next.fahrzeug_id) {
          next.arbeitsauftrag_id = hit.order.id;
        }
      }
    }

    if (next.machine_id && !next.arbeitsauftrag_id && nr && machineIndex?.has(nr)) {
      const hit = machineIndex.get(nr);
      if (hit?.machineId === next.machine_id) {
        next.arbeitsauftrag_id = hit.order.id;
      }
    }

    if (next.fahrzeug_id && !next.arbeitsauftrag_id && nr && pkwIndex?.has(nr)) {
      const hit = pkwIndex.get(nr);
      if (hit?.fahrzeugId === next.fahrzeug_id) {
        next.arbeitsauftrag_id = hit.order.id;
      }
    }

    return next;
  });
}
