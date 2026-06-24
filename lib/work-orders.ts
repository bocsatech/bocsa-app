import type { WorkOrderProtocol } from "./arbeitsauftrag-protokoll";
import type { WorkOrderProtocolSource } from "./geraetgruppe-protokoll";
import {
  collectCheckedRepairLabels,
  createDefaultProtocol,
  normalizeProtocol,
} from "./arbeitsauftrag-protokoll";
import type { Machine } from "./types/machine";
import type { MaintenanceLagerLink } from "./types/maintenance";
import type { WorkOrderServicePart } from "./types/work-order-parts";
import {
  preserveProtokollVorlageKeys,
} from "./machine-protokoll-vorlage.mjs";
import {
  formatGermanDate,
  germanDateComparable,
  germanToday,
  isGermanDateInRange,
  normalizeGermanDate,
} from "./dates";

export type { WorkOrderProtocol } from "./arbeitsauftrag-protokoll";

export type { WorkOrderServicePart } from "./types/work-order-parts";

export type WorkOrder = {
  id: string;
  /** Automatische Auftrag-Nr. (Legacy S05.26.S00001 oder neu S06.26-S-KB-GG-BG15-00001) */
  auftragNr?: string;
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
  /** Woher die Protokoll-Struktur stammt (Vorlage vs. eigen) */
  protocolSource?: WorkOrderProtocolSource;
  protocolSubgroup?: string | null;
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
  auftrag: string;
  bearbeiter: string;
  dateFrom: string;
  dateTo: string;
  filiale: string;
};

export const EMPTY_WORK_ORDER_FILTERS: WorkOrderListFilters = {
  geraetenummer: "",
  auftrag: "",
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

export function truncateRepairDescription(text: string, maxLength = 42) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "—";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

export function workOrderUserLabel(
  entry: Pick<WorkOrder, "updatedBy" | "createdBy">
) {
  return entry.updatedBy?.trim() || entry.createdBy?.trim() || "";
}

export function formatWorkOrderHourMeter(
  order: Pick<WorkOrder, "hourMeterMachine" | "hourMeterReturn">
) {
  const value =
    order.hourMeterMachine?.trim() || order.hourMeterReturn?.trim() || "";
  return value || "—";
}

export function formatWorkOrderHourMeterDisplay(
  order: Pick<WorkOrder, "hourMeterMachine" | "hourMeterReturn">
) {
  const value =
    order.hourMeterMachine?.trim() || order.hourMeterReturn?.trim() || "";
  if (!value) return "—";
  if (/\bbh\b/i.test(value)) return value;
  return `${value} Bh`;
}

/** Letzte erfasste Betriebsstunden: neuester Arbeitsauftrag, sonst Stundenzählerstand. */
export function getLastRecordedBetriebsstundenDisplay(machine: Machine | null): string | null {
  if (!machine) return null;

  for (const order of getWorkOrders(machine)) {
    const raw =
      order.hourMeterMachine?.trim() || order.hourMeterReturn?.trim() || "";
    if (!raw) continue;
    const display = formatWorkOrderHourMeterDisplay(order);
    return display === "—" ? null : display;
  }

  const reading = machine.hour_meter_reading;
  if (reading !== null && reading !== undefined && reading !== "") {
    const num = Number(reading);
    if (Number.isFinite(num)) {
      return `${num.toLocaleString("de-AT")} Bh`;
    }
  }

  return null;
}

export function formatWorkOrderAuftragNr(order: Pick<WorkOrder, "id" | "auftragNr">) {
  const nr = order.auftragNr?.trim();
  if (nr) return nr;
  const digits = order.id.replace(/\D/g, "");
  if (digits.length >= 6) return digits.slice(-9);
  const compact = order.id.replace(/^wo_/, "").trim();
  return compact || "—";
}

/** Referenz in Lagerbewegungen kann formatWorkOrderAuftragNr-Wert sein, nicht nur order.auftragNr. */
export function workOrderMatchesAuftragNr(
  order: Pick<WorkOrder, "id" | "auftragNr">,
  query: string
): boolean {
  const q = query.trim();
  if (!q) return false;
  const nr = order.auftragNr?.trim();
  if (nr && nr === q) return true;
  return formatWorkOrderAuftragNr(order) === q;
}

export function findWorkOrderByAuftragNr<T extends Pick<WorkOrder, "id" | "auftragNr">>(
  orders: T[],
  query: string
): T | undefined {
  const q = query.trim();
  if (!q) return undefined;
  return orders.find((order) => workOrderMatchesAuftragNr(order, q));
}

export type WorkOrderInfoPart = {
  text: string;
  tone?: "blue" | "green" | "default";
};

export function buildWorkOrderInfoParts(order: WorkOrder): WorkOrderInfoPart[] {
  const parts: WorkOrderInfoPart[] = [];
  const notes = order.notes?.trim();
  const repair = order.repairDescription?.trim();

  if (notes) parts.push({ text: notes });
  if (repair && repair !== notes) parts.push({ text: repair, tone: "blue" });
  for (const label of collectCheckedRepairLabels(order.protocol)) {
    parts.push({ text: label, tone: "green" });
  }
  const typeLabel = formatOrderType(order.type);
  if (parts.length === 0 && typeLabel !== "—") {
    parts.push({ text: typeLabel, tone: "blue" });
  }
  return parts;
}

export function formatWorkOrderStatus(order: WorkOrder) {
  const custom = order.repairStatus?.trim();
  if (custom) return custom.endsWith("!") ? custom : `${custom} !`;
  const typeLabel = formatOrderType(order.type);
  if (typeLabel === "—") return "—";
  return `${typeLabel} !`;
}

export function formatWorkOrderDepot(
  order: Pick<WorkOrder, "depot">,
  machineDepot?: string | null
) {
  const depot = order.depot?.trim() || machineDepot?.trim() || "";
  if (!depot) return "—";
  return depot.toLowerCase().startsWith("depot") ? depot : `Depot ${depot}`;
}

/** Arbeitsstunden aus Arbeitsauftrag-Feld (z. B. „2,5“ oder „2.5“) */
export function parseWorkHours(value: string): number {
  const trimmed = String(value ?? "").trim().replace(/\s*h$/i, "");
  if (!trimmed) return 0;
  const num = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num * 100) / 100;
}

/** Anzeige für Druck / Vorschau (z. B. „2,5 h“ oder „—“) */
export function formatWorkHoursDisplay(value: string | undefined | null): string {
  const hours = parseWorkHours(String(value ?? ""));
  if (hours <= 0) return "—";
  return `${hours.toLocaleString("de-AT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} h`;
}

export function filterWorkOrderEntries(
  entries: WorkOrderListEntry[],
  filters: WorkOrderListFilters
) {
  const geraet = normalizeFilterValue(filters.geraetenummer);
  const auftrag = normalizeFilterValue(filters.auftrag);
  const bearbeiter = normalizeFilterValue(filters.bearbeiter);
  const filiale = normalizeFilterValue(filters.filiale);
  const dateFrom = normalizeGermanDate(filters.dateFrom.trim()) ?? "";
  const dateTo = normalizeGermanDate(filters.dateTo.trim()) ?? "";

  return entries.filter((entry) => {
    if (geraet && !normalizeFilterValue(entry.geraetenummer).includes(geraet)) {
      return false;
    }

    if (auftrag) {
      const query = filters.auftrag.trim();
      const nr = normalizeFilterValue(entry.auftragNr ?? "");
      const typeLabel = normalizeFilterValue(formatOrderType(entry.type));
      const rawType = normalizeFilterValue(entry.type);
      const matchesAuftragNr = query ? workOrderMatchesAuftragNr(entry, query) : false;
      if (
        !matchesAuftragNr &&
        !nr.includes(auftrag) &&
        typeLabel !== auftrag &&
        rawType !== auftrag &&
        !rawType.includes(auftrag)
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

    if (dateFrom || dateTo) {
      const from = dateFrom || "01.01.1970";
      const to = dateTo || "31.12.2099";
      if (!isGermanDateInRange(entry.date, from, to)) return false;
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
  protocol?: WorkOrderProtocol;
  protocolSource?: WorkOrderProtocolSource;
  protocolSubgroup?: string | null;
}): WorkOrder {
  const now = new Date();
  const date = germanToday();
  const time = now.toTimeString().slice(0, 5);
  const stamp = now.toISOString();

  return {
    id: newWorkOrderId(),
    auftragNr: "",
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
    protocol: options?.protocol ?? createDefaultProtocol(),
    protocolSource: options?.protocolSource ?? "standard",
    protocolSubgroup: options?.protocolSubgroup ?? null,
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
  const sourceTab =
    machine.machine_tab_data && typeof machine.machine_tab_data === "object"
      ? (machine.machine_tab_data as Record<string, unknown>)
      : {};

  const tabData: Record<string, unknown> = { ...sourceTab };

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

  tabData.work_orders = work_orders;
  preserveProtokollVorlageKeys(tabData, sourceTab);

  return tabData;
}

export function removeWorkOrder(
  machine: Machine,
  orderId: string
): Record<string, unknown> {
  const sourceTab =
    machine.machine_tab_data && typeof machine.machine_tab_data === "object"
      ? (machine.machine_tab_data as Record<string, unknown>)
      : {};

  const tabData: Record<string, unknown> = { ...sourceTab };
  tabData.work_orders = getWorkOrders(machine).filter((item) => item.id !== orderId);
  preserveProtokollVorlageKeys(tabData, sourceTab);
  return tabData;
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

  return {
    ...order,
    auftragNr:
      typeof order.auftragNr === "string" ? order.auftragNr.trim() : "",
    date: formatGermanDate(order.date) || String(order.date ?? "").trim(),
    notes: typeof order.notes === "string" ? order.notes : "",
    parts: Array.isArray(order.parts) ? order.parts : [],
    serviceParts,
    protocol,
    protocolSource:
      order.protocolSource === "gruppe" ||
      order.protocolSource === "eigen" ||
      order.protocolSource === "standard"
        ? order.protocolSource
        : undefined,
    protocolSubgroup:
      typeof order.protocolSubgroup === "string" ? order.protocolSubgroup.trim() || null : null,
    repairDescription: typeof order.repairDescription === "string" ? order.repairDescription : "",
    repairStatus: typeof order.repairStatus === "string" ? order.repairStatus : "",
  };
}

export function getWorkOrderSortKey(order: Pick<WorkOrder, "date" | "time">) {
  const isoDate = germanDateComparable(order.date) || "0000-00-00";
  const time = String(order.time ?? "").trim();
  const normalizedTime = /^\d{2}:\d{2}$/.test(time) ? time : "00:00";
  return `${isoDate}${normalizedTime}`;
}

export function isWorkOrder(value: unknown): value is WorkOrder {
  if (!value || typeof value !== "object") return false;
  return typeof (value as WorkOrder).id === "string";
}
