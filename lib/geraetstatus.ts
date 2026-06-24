import type { Machine } from "./types/machine";
import type { WorkOrder } from "./work-orders";

export const GERAETSTATUS_OPTIONS = ["Fertig", "In Reperatur"] as const;

export type GeraetstatusValue = (typeof GERAETSTATUS_OPTIONS)[number];

export function defaultRepairStatusForOrderType(type: string): GeraetstatusValue {
  const normalized = type.trim().toLowerCase();
  if (normalized === "reparatur" || normalized === "reperatur") {
    return "In Reperatur";
  }
  return "Fertig";
}

export function readMachineGeratstatus(
  machine: Pick<Machine, "damage_status" | "schadensmeldung_status" | "status"> | null | undefined
) {
  const value =
    machine?.damage_status ??
    machine?.schadensmeldung_status ??
    machine?.status ??
    "";
  return String(value ?? "").trim();
}

/** Auftrag-Status: zuerst repairStatus, sonst Maschine, sonst Typ-Default. */
export function resolveOrderRepairStatus(
  order: Pick<WorkOrder, "repairStatus" | "type">,
  machine?: Pick<Machine, "damage_status" | "schadensmeldung_status" | "status"> | null
): GeraetstatusValue {
  const fromOrder = order.repairStatus?.trim();
  if (fromOrder === "Fertig" || fromOrder === "In Reperatur") {
    return fromOrder;
  }
  if (fromOrder) {
    const lower = fromOrder.toLowerCase();
    if (lower === "in reparatur" || lower === "in reperatur") return "In Reperatur";
    if (lower === "fertig") return "Fertig";
  }

  const fromMachine = readMachineGeratstatus(machine);
  if (fromMachine) {
    const lower = fromMachine.toLowerCase();
    if (lower === "in reparatur" || lower === "in reperatur") return "In Reperatur";
    if (lower === "fertig") return "Fertig";
    return fromMachine as GeraetstatusValue;
  }

  return defaultRepairStatusForOrderType(order.type);
}

export function formatGeratstatusLabel(value: string) {
  const text = value.trim();
  return text || "—";
}
