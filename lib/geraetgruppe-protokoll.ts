import {
  createDefaultProtocol,
  newProtocolRowId,
  normalizeProtocol,
  type WorkOrderProtocol,
  type WorkOrderRepairGroup,
  type WorkOrderScheduleRow,
} from "./arbeitsauftrag-protokoll";
import type { Machine } from "./types/machine";

export type ProtocolVorlageStored = {
  motorOilFillLiters: string;
  serviceSchedule: Array<{
    serviceMaterial: string;
    juraHifi: string;
    sfFilter: string;
    menge?: number;
  }>;
  repairGroups: Array<{
    title: string;
    items: Array<{ label: string; tone?: "blue" | "green" | "default" }>;
  }>;
};

export type GeraetgruppeProtokollVorlageRow = {
  subgroup: string;
  bezeichnung: string | null;
  vorlage: ProtocolVorlageStored;
  updated_at?: string;
  updated_by?: string | null;
};

export type WorkOrderProtocolSource = "gruppe" | "eigen" | "standard";

const MACHINE_EIGEN_VORLAGE_KEY = "protokoll_vorlage_eigen";
const MACHINE_EIGEN_AKTIV_KEY = "protokoll_vorlage_eigen_aktiv";

export function normalizeSubgroupKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function protocolToStoredVorlage(protocol: WorkOrderProtocol): ProtocolVorlageStored {
  return {
    motorOilFillLiters: String(protocol.motorOilFillLiters ?? "").trim() || "8 Liter",
    serviceSchedule: protocol.serviceSchedule.map((row) => ({
      serviceMaterial: row.serviceMaterial.trim(),
      juraHifi: row.juraHifi.trim(),
      sfFilter: row.sfFilter.trim(),
      menge: row.menge > 0 ? row.menge : 1,
    })),
    repairGroups: protocol.repairGroups.map((group) => ({
      title: group.title.trim(),
      items: group.items
        .map((item) => {
          const tone: "blue" | "green" | "default" =
            item.tone === "blue" || item.tone === "green" ? item.tone : "default";
          return { label: item.label.trim(), tone };
        })
        .filter((item) => item.label),
    })),
  };
}

export function cloneProtocolFromVorlage(
  stored: ProtocolVorlageStored | null | undefined
): WorkOrderProtocol {
  if (!stored || typeof stored !== "object") {
    return createDefaultProtocol();
  }

  const scheduleRows: WorkOrderScheduleRow[] = (stored.serviceSchedule ?? []).map((row) => ({
    id: newProtocolRowId(),
    serviceMaterial: String(row.serviceMaterial ?? ""),
    juraHifi: String(row.juraHifi ?? ""),
    sfFilter: String(row.sfFilter ?? ""),
    lagerTeilId: null,
    menge: typeof row.menge === "number" && row.menge > 0 ? row.menge : 1,
    lagerstandSnapshot: null,
    lagerIssuedMenge: 0,
  }));

  const repairGroups: WorkOrderRepairGroup[] = (stored.repairGroups ?? []).map((group) => ({
    id: newProtocolRowId(),
    title: String(group.title ?? ""),
    items: (group.items ?? []).map((item) => ({
      id: newProtocolRowId(),
      label: String(item.label ?? ""),
      checked: false,
      tone: item.tone === "blue" || item.tone === "green" ? item.tone : "default",
    })),
  }));

  return normalizeProtocol({
    motorOilFillLiters: stored.motorOilFillLiters ?? "8 Liter",
    serviceSchedule: scheduleRows,
    repairGroups,
  });
}

export function machineHasEigenProtokollVorlage(machine: Machine | null | undefined) {
  const tab = machine?.machine_tab_data as Record<string, unknown> | null | undefined;
  return Boolean(tab?.[MACHINE_EIGEN_AKTIV_KEY] && tab?.[MACHINE_EIGEN_VORLAGE_KEY]);
}

export function readMachineEigenVorlage(
  machine: Machine | null | undefined
): ProtocolVorlageStored | null {
  const tab = machine?.machine_tab_data as Record<string, unknown> | null | undefined;
  if (!tab?.[MACHINE_EIGEN_AKTIV_KEY]) return null;
  const raw = tab[MACHINE_EIGEN_VORLAGE_KEY];
  if (!raw || typeof raw !== "object") return null;
  return raw as ProtocolVorlageStored;
}

export function buildMachineEigenVorlagePatch(
  machine: Machine,
  vorlage: ProtocolVorlageStored | null,
  aktiv: boolean
): Record<string, unknown> {
  const tab = {
    ...((machine.machine_tab_data as Record<string, unknown> | null) ?? {}),
  };
  if (aktiv && vorlage) {
    tab[MACHINE_EIGEN_AKTIV_KEY] = true;
    tab[MACHINE_EIGEN_VORLAGE_KEY] = vorlage;
  } else {
    delete tab[MACHINE_EIGEN_AKTIV_KEY];
    delete tab[MACHINE_EIGEN_VORLAGE_KEY];
  }
  return { machine_tab_data: tab };
}

export function resolveProtocolForMachine(
  machine: Machine | null | undefined,
  gruppenVorlage: ProtocolVorlageStored | null | undefined
): { protocol: WorkOrderProtocol; source: WorkOrderProtocolSource; subgroup: string | null } {
  const eigen = readMachineEigenVorlage(machine);
  if (eigen) {
    return {
      protocol: cloneProtocolFromVorlage(eigen),
      source: "eigen",
      subgroup: normalizeSubgroupKey(machine?.subgroup) || null,
    };
  }

  const subgroup = normalizeSubgroupKey(machine?.subgroup);
  if (subgroup && gruppenVorlage) {
    return {
      protocol: cloneProtocolFromVorlage(gruppenVorlage),
      source: "gruppe",
      subgroup,
    };
  }

  if (subgroup && gruppenVorlage === undefined) {
    return {
      protocol: createDefaultProtocol(),
      source: "standard",
      subgroup,
    };
  }

  return {
    protocol: cloneProtocolFromVorlage(gruppenVorlage ?? null),
    source: gruppenVorlage ? "gruppe" : "standard",
    subgroup: subgroup || null,
  };
}

export async function fetchGruppenProtokollVorlage(subgroup: string) {
  const key = encodeURIComponent(normalizeSubgroupKey(subgroup) || "ALLGEMEIN");
  const response = await fetch(`/api/geraetgruppen/protokoll/${key}?ts=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      data: null,
      error: { message: result?.error ?? "Vorlage konnte nicht geladen werden." },
    };
  }
  return {
    data: result as GeraetgruppeProtokollVorlageRow,
    error: null,
  };
}

export async function fetchProtocolForNewWorkOrder(machine: Machine) {
  const subgroup = normalizeSubgroupKey(machine.subgroup);
  let gruppenVorlage: ProtocolVorlageStored | null | undefined = undefined;

  if (subgroup && !machineHasEigenProtokollVorlage(machine)) {
    const { data, error } = await fetchGruppenProtokollVorlage(subgroup);
    if (!error && data?.vorlage) {
      gruppenVorlage = data.vorlage;
    } else if (error) {
      const fallback = await fetchGruppenProtokollVorlage("ALLGEMEIN");
      if (!fallback.error && fallback.data?.vorlage) {
        gruppenVorlage = fallback.data.vorlage;
      }
    }
  }

  return resolveProtocolForMachine(machine, gruppenVorlage);
}

export async function saveGruppenProtokollVorlage(
  subgroup: string,
  vorlage: ProtocolVorlageStored,
  bezeichnung?: string
) {
  const key = encodeURIComponent(normalizeSubgroupKey(subgroup));
  const response = await fetch(`/api/geraetgruppen/protokoll/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      bezeichnung: bezeichnung?.trim() || null,
      vorlage,
    }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      data: null,
      error: { message: result?.error ?? "Vorlage konnte nicht gespeichert werden." },
    };
  }
  return { data: result as GeraetgruppeProtokollVorlageRow, error: null };
}

export async function fetchGruppenProtokollOverview() {
  const response = await fetch(`/api/geraetgruppen/protokoll?ts=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      data: null,
      error: { message: result?.error ?? "Übersicht konnte nicht geladen werden." },
    };
  }
  return {
    data: result as {
      templates: GeraetgruppeProtokollVorlageRow[];
      subgroupsFromMachines: string[];
    },
    error: null,
  };
}
