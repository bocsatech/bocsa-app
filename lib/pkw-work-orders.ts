import type { WorkOrder, WorkOrderListEntry, WorkOrderListFilters } from "./work-orders";
import {
  EMPTY_WORK_ORDER_FILTERS,
  createEmptyWorkOrder,
  filterWorkOrderEntries,
  formatOrderType,
  findWorkOrderByAuftragNr,
  formatWorkOrderAuftragNr,
  getWorkOrderSortKey,
  isWorkOrder,
  normalizeWorkOrder,
  newWorkOrderId,
  truncateRepairDescription,
  workOrderUserLabel,
} from "./work-orders";
import type { PkwFahrzeug } from "./types/pkw";
import { formatKundeName } from "./pkw";

export type PkwWorkOrderListEntry = WorkOrder & {
  fahrzeugId: string;
  kennzeichen: string;
  bezeichnung: string;
  kunde: string;
};

export type PkwWorkOrderListFilters = {
  kennzeichen: string;
  auftrag: string;
  bearbeiter: string;
  dateFrom: string;
  dateTo: string;
  kunde: string;
};

export const EMPTY_PKW_WORK_ORDER_FILTERS: PkwWorkOrderListFilters = {
  kennzeichen: "",
  auftrag: "",
  bearbeiter: "",
  dateFrom: "",
  dateTo: "",
  kunde: "",
};

export {
  createEmptyWorkOrder,
  findWorkOrderByAuftragNr,
  formatOrderType,
  formatWorkOrderAuftragNr,
  newWorkOrderId,
  normalizeWorkOrder,
  truncateRepairDescription,
  workOrderUserLabel,
};
export type { WorkOrder };

function readTabData(fahrzeug: PkwFahrzeug | null): Record<string, unknown> {
  if (!fahrzeug?.tab_data || typeof fahrzeug.tab_data !== "object") return {};
  return fahrzeug.tab_data as Record<string, unknown>;
}

export function getPkwWorkOrders(fahrzeug: PkwFahrzeug | null): WorkOrder[] {
  const orders = readTabData(fahrzeug).work_orders;
  if (!Array.isArray(orders)) return [];

  return orders
    .filter(isWorkOrder)
    .map(normalizeWorkOrder)
    .sort((a, b) => getWorkOrderSortKey(b).localeCompare(getWorkOrderSortKey(a)));
}

export function collectAllPkwWorkOrders(fahrzeuge: PkwFahrzeug[]): PkwWorkOrderListEntry[] {
  const entries: PkwWorkOrderListEntry[] = [];

  for (const fahrzeug of fahrzeuge) {
    const kundeLabel = fahrzeug.kunde ? formatKundeName(fahrzeug.kunde) : "";
    const bezeichnung = [fahrzeug.marke, fahrzeug.modell].filter(Boolean).join(" ").trim();

    for (const order of getPkwWorkOrders(fahrzeug)) {
      entries.push({
        ...order,
        fahrzeugId: fahrzeug.id,
        kennzeichen: String(fahrzeug.kennzeichen ?? ""),
        bezeichnung,
        kunde: kundeLabel,
      });
    }
  }

  return entries.sort((a, b) => getWorkOrderSortKey(b).localeCompare(getWorkOrderSortKey(a)));
}

export function mergePkwWorkOrder(
  fahrzeug: PkwFahrzeug,
  order: WorkOrder,
  username?: string
): Record<string, unknown> {
  const sourceTab = readTabData(fahrzeug);
  const tabData: Record<string, unknown> = { ...sourceTab };

  const existing = getPkwWorkOrders(fahrzeug);
  const stamp = new Date().toISOString();
  const nextOrder = normalizeWorkOrder({
    ...order,
    updatedAt: stamp,
    updatedBy: username || order.updatedBy || order.createdBy,
  });

  const index = existing.findIndex((item) => item.id === order.id);
  const work_orders =
    index >= 0
      ? existing.map((item, i) => (i === index ? nextOrder : item))
      : [nextOrder, ...existing];

  tabData.work_orders = work_orders;
  return tabData;
}

function normalizeFilterValue(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function filterPkwWorkOrderEntries(
  entries: PkwWorkOrderListEntry[],
  filters: PkwWorkOrderListFilters
) {
  const machineLike: WorkOrderListEntry[] = entries.map((entry) => ({
    ...entry,
    machineId: entry.fahrzeugId,
    geraetenummer: entry.kennzeichen,
    bezeichnung: entry.bezeichnung,
    filiale: entry.kunde,
  }));

  const machineFilters: WorkOrderListFilters = {
    geraetenummer: filters.kennzeichen,
    auftrag: filters.auftrag,
    bearbeiter: filters.bearbeiter,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    filiale: filters.kunde,
  };

  const filtered = filterWorkOrderEntries(machineLike, machineFilters);
  const ids = new Set(filtered.map((entry) => `${entry.machineId}-${entry.id}`));
  return entries.filter((entry) => ids.has(`${entry.fahrzeugId}-${entry.id}`));
}

export { EMPTY_WORK_ORDER_FILTERS };
