import type { WorkOrderProtocol } from "./arbeitsauftrag-protokoll";
import { createDefaultProtocol, normalizeProtocol } from "./arbeitsauftrag-protokoll";
import type { Machine } from "./types/machine";
import type { MaintenanceLagerLink } from "./types/maintenance";
import type { WorkOrderServicePart } from "./types/work-order-parts";
import { toAustriaDateString, toIsoDateString } from "./machines";

export type { WorkOrderProtocol } from "./arbeitsauftrag-protokoll";

export type { WorkOrderServicePart } from "./types/work-order-parts";

export type WorkOrder = {
  id: string;
  type: string;
  depot: string;
  date: string;
  time: string;
  hourMeterReturn: string;
  hourMeterMachine: string;
  repairDescription: string;
  workHours: string;
  repairStatus: string;
  /** Freitext / Bemerkung zum Auftrag */
  notes: string;
  /** @deprecated Legacy — wird bei Laden in serviceParts überführt */
  parts: MaintenanceLagerLink[];
  /** Service-Material / Filter (frei editierbar) */
  serviceParts: WorkOrderServicePart[];
  /** Wartungsplan + Reparaturdaten (Protokoll) */
  protocol: WorkOrderProtocol;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
};

export type WorkOrderListEntry = WorkOrder & {
  machineId: string;
  geraetenummer: string;
  bezeichnung: string;
  filiale: string;
};

export type WorkOrderListFilters = {
  geraetenummer: string;
  /** Auftrag-Nr. (order.id / formatWorkOrderNumber) */
  auftrag: string;
  /** Auftragsart (Service, Reparatur, …) */
  auftragsart: string;
  bearbeiter: string;
  dateFrom: string;
  dateTo: string;
  filiale: string;
};

export const EMPTY_WORK_ORDER_FILTERS: WorkOrderListFilters = {
  geraetenummer: "",
  auftrag: "",
  auftragsart: "",
  bearbeiter: "",
  dateFrom: "",
  dateTo: "",
  filiale: "",
};

export function formatOrderType(type: string) {
  const value = type.trim();
  if (!value) return "—";
  if (value === "Reperatur") return "Reparatur";
  return value;
}

/** Anzeige der Auftrag-Nr. (ohne wo_-Präfix). */
export function formatWorkOrderNumber(order: Pick<WorkOrder, "id"> | string): string {
  const raw =
    typeof order === "string" ? order.trim() : String(order.id ?? "").trim();
  if (!raw) return "—";
  if (raw.startsWith("wo_")) return raw.slice(3);
  return raw;
}

export function formatWorkOrderDisplay(order: Pick<WorkOrder, "id" | "type">) {
  return {
    number: formatWorkOrderNumber(order),
    typeLabel: formatOrderType(order.type),
  };
}

function workOrderNumberMatchesFilter(entry: WorkOrderListEntry, filter: string) {
  const needle = normalizeFilterValue(filter);
  if (!needle) return true;

  const idNorm = normalizeFilterValue(entry.id);
  const displayNorm = normalizeFilterValue(formatWorkOrderNumber(entry));

  return idNorm.includes(needle) || displayNorm.includes(needle);
}

export function truncateRepairDescription(text: string, maxLength = 42) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "—";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

export function workOrderUserLabel(entry: WorkOrderListEntry) {
  return entry.updatedBy || entry.createdBy || "";
}

/** Arbeitsstunden aus Arbeitsauftrag-Feld (z. B. „2,5“ oder „2.5“) */
export function parseWorkHours(value: string): number {
  const trimmed = String(value ?? "").trim().replace(/\s*h$/i, "");
  if (!trimmed) return 0;
  const num = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num * 100) / 100;
}

export function filterWorkOrderEntries(
  entries: WorkOrderListEntry[],
  filters: WorkOrderListFilters
) {
  const geraet = normalizeFilterValue(filters.geraetenummer);
  const auftragsart = normalizeFilterValue(filters.auftragsart);
  const bearbeiter = normalizeFilterValue(filters.bearbeiter);
  const filiale = normalizeFilterValue(filters.filiale);
  const dateFrom = toIsoDateString(filters.dateFrom.trim());
  const dateTo = toIsoDateString(filters.dateTo.trim());

  return entries.filter((entry) => {
    if (geraet && !normalizeFilterValue(entry.geraetenummer).includes(geraet)) {
      return false;
    }

    if (!workOrderNumberMatchesFilter(entry, filters.auftrag)) {
      return false;
    }

    if (auftragsart) {
      const typeLabel = normalizeFilterValue(formatOrderType(entry.type));
      const rawType = normalizeFilterValue(entry.type);
      if (
        typeLabel !== auftragsart &&
        rawType !== auftragsart &&
        !typeLabel.includes(auftragsart) &&
        !rawType.includes(auftragsart)
      ) {
        return false;
      }
    }

    const userLabel = normalizeFilterValue(workOrderUserLabel(entry));
    if (bearbeiter && !userLabel.includes(bearbeiter)) {
      return false;
    }

    if (filiale && !normalizeFilterValue(entry.filiale).includes(filiale)) {
      return false;
    }

    const orderDate = toIsoDateString(entry.date?.trim() ?? "");
    if (dateFrom && (!orderDate || orderDate < dateFrom)) {
      return false;
    }
    if (dateTo && (!orderDate || orderDate > dateTo)) {
      return false;
    }

    return true;
  });
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

export function getWorkOrders(machine: Machine | null): WorkOrder[] {
  const tabData = machine?.machine_tab_data;
  if (!tabData || typeof tabData !== "object") return [];

  const orders = (tabData as Record<string, unknown>).work_orders;
  if (!Array.isArray(orders)) return [];

  return orders
    .filter(isWorkOrder)
    .map(normalizeWorkOrder)
    .sort((a, b) => getWorkOrderSortKey(b).localeCompare(getWorkOrderSortKey(a)));
}

export function collectAllWorkOrders(machines: Machine[]): WorkOrderListEntry[] {
  const entries: WorkOrderListEntry[] = [];

  for (const machine of machines) {
    for (const order of getWorkOrders(machine)) {
      entries.push({
        ...order,
        machineId: machine.id,
        geraetenummer: String(machine.geraetenummer ?? ""),
        bezeichnung: String(machine.bezeichnung ?? machine.subgroup ?? ""),
        filiale: String(order.depot?.trim() || machine.depot?.trim() || ""),
      });
    }
  }

  return entries.sort((a, b) => getWorkOrderSortKey(b).localeCompare(getWorkOrderSortKey(a)));
}

export function newWorkOrderId() {
  return `wo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyWorkOrder(options?: {
  type?: string;
  depot?: string;
  username?: string;
}): WorkOrder {
  const now = new Date();
  const date = toAustriaDateString(now);
  const time = now.toTimeString().slice(0, 5);
  const stamp = now.toISOString();

  return {
    id: newWorkOrderId(),
    type: options?.type?.trim() || "Service",
    depot: options?.depot?.trim() || "",
    date,
    time,
    hourMeterReturn: "",
    hourMeterMachine: "",
    repairDescription: "",
    workHours: "",
    repairStatus: "",
    notes: "",
    parts: [],
    serviceParts: [],
    protocol: createDefaultProtocol(),
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: options?.username,
    updatedBy: options?.username,
  };
}

export function mergeWorkOrder(
  machine: Machine,
  order: WorkOrder,
  username?: string
): Record<string, unknown> {
  const tabData =
    machine.machine_tab_data && typeof machine.machine_tab_data === "object"
      ? { ...(machine.machine_tab_data as Record<string, unknown>) }
      : {};

  const existing = getWorkOrders(machine);
  const stamp = new Date().toISOString();
  const nextOrder: WorkOrder = normalizeWorkOrder({
    ...order,
    updatedAt: stamp,
    updatedBy: username || order.updatedBy || order.createdBy,
  });

  const index = existing.findIndex((item) => item.id === order.id);
  const work_orders =
    index >= 0
      ? existing.map((item, i) => (i === index ? nextOrder : item))
      : [nextOrder, ...existing];

  return { ...tabData, work_orders };
}

export function newServicePartId() {
  return `sp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyServicePart(
  partial?: Partial<WorkOrderServicePart>
): WorkOrderServicePart {
  return {
    id: partial?.id ?? newServicePartId(),
    serviceMaterial: partial?.serviceMaterial ?? "",
    juraHifi: partial?.juraHifi ?? "",
    sfFilter: partial?.sfFilter ?? "",
    lagerTeilId: partial?.lagerTeilId ?? null,
    menge: partial?.menge,
  };
}

function normalizeServicePartsFromOrder(order: Record<string, unknown>): WorkOrderServicePart[] {
  const raw = order.serviceParts;
  if (Array.isArray(raw)) {
    return raw
      .filter((row) => row && typeof row === "object")
      .map((row) => {
        const item = row as Record<string, unknown>;
        return createEmptyServicePart({
          id: String(item.id ?? newServicePartId()),
          serviceMaterial: String(item.serviceMaterial ?? ""),
          juraHifi: String(item.juraHifi ?? ""),
          sfFilter: String(item.sfFilter ?? ""),
          lagerTeilId:
            typeof item.lagerTeilId === "string" ? item.lagerTeilId : null,
          menge:
            typeof item.menge === "number" && Number.isFinite(item.menge)
              ? item.menge
              : undefined,
        });
      });
  }

  const legacy = order.parts;
  if (!Array.isArray(legacy)) return [];

  return legacy
    .filter((row) => row && typeof row === "object")
    .map((row) => {
      const item = row as MaintenanceLagerLink;
      const label = item.bezeichnung?.trim() || item.herstellernummer?.trim() || "";
      return createEmptyServicePart({
        serviceMaterial: label,
        juraHifi: item.herstellernummer?.trim() ?? "",
        sfFilter: "",
        lagerTeilId: item.lagerTeilId,
      });
    });
}

function servicePartsFromSchedule(
  schedule: WorkOrderProtocol["serviceSchedule"]
): WorkOrderServicePart[] {
  return schedule.map((row) =>
    createEmptyServicePart({
      id: row.id,
      serviceMaterial: row.serviceMaterial,
      juraHifi: row.juraHifi,
      sfFilter: row.sfFilter,
      lagerTeilId: row.lagerTeilId ?? null,
      menge: row.menge,
    })
  );
}

export function normalizeWorkOrder(order: WorkOrder): WorkOrder {
  const record = order as unknown as Record<string, unknown>;
  const legacyServiceParts = normalizeServicePartsFromOrder(record);
  const protocol = normalizeProtocol(record.protocol, legacyServiceParts);
  const serviceParts = servicePartsFromSchedule(protocol.serviceSchedule);
  const id =
    typeof order.id === "string" && order.id.trim() ? order.id.trim() : newWorkOrderId();

  return {
    ...order,
    id,
    date: toAustriaDateString(order.date) || String(order.date ?? "").trim(),
    notes: typeof order.notes === "string" ? order.notes : "",
    parts: Array.isArray(order.parts) ? order.parts : [],
    serviceParts,
    protocol,
    repairDescription: typeof order.repairDescription === "string" ? order.repairDescription : "",
  };
}

function getWorkOrderSortKey(order: Pick<WorkOrder, "date" | "time">) {
  const isoDate = toIsoDateString(order.date) || "0000-00-00";
  const time = String(order.time ?? "").trim();
  const normalizedTime = /^\d{2}:\d{2}$/.test(time) ? time : "00:00";
  return `${isoDate}${normalizedTime}`;
}

function isWorkOrder(value: unknown): value is WorkOrder {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.id === "string" && record.id.trim()) return true;
  return (
    typeof record.type === "string" ||
    typeof record.date === "string" ||
    record.protocol != null ||
    Array.isArray(record.serviceParts) ||
    Array.isArray(record.parts)
  );
}
