import type { LagerTeil } from "./types/lager";
import { findLagerTeilByHersteller, issueLagerStock } from "./lager";

export type WorkOrderScheduleRow = {
  id: string;
  serviceMaterial: string;
  juraHifi: string;
  sfFilter: string;
  /** Verknüpfung mit Lager (optional) */
  lagerTeilId?: string | null;
  /** Verbrauchte / geplante Menge */
  menge: number;
  /** Lagerstand beim Hinzufügen (Anzeige-Fallback) */
  lagerstandSnapshot?: number | null;
  /** Bereits aus dem Lager ausgebuchte Menge (dieser Auftrag) */
  lagerIssuedMenge?: number;
};

export function normalizeScheduleMenge(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw < 0 ? 0 : raw;
  }
  const text = String(raw ?? "")
    .trim()
    .replace(",", ".");
  if (!text) return 0;
  const value = Number.parseFloat(text);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

/** Menge per Klick erhöhen/verringern (Schritt 1). */
export function stepScheduleMenge(current: number, delta: number): number {
  return normalizeScheduleMenge(current + delta);
}

/** Alle angehakten Reparaturdaten-Zeilen (Anzeige über Bemerkung). */
export function collectCheckedRepairLabels(protocol: WorkOrderProtocol): string[] {
  const labels: string[] = [];
  for (const group of protocol.repairGroups) {
    for (const item of group.items) {
      if (!item.checked) continue;
      const label = item.label.trim();
      if (label) labels.push(label);
    }
  }
  return labels;
}

export type WorkOrderRepairItem = {
  id: string;
  label: string;
  checked: boolean;
  tone?: "blue" | "green" | "default";
};

export type WorkOrderRepairGroup = {
  id: string;
  title: string;
  items: WorkOrderRepairItem[];
};

export type WorkOrderProtocol = {
  motorOilFillLiters: string;
  serviceSchedule: WorkOrderScheduleRow[];
  repairGroups: WorkOrderRepairGroup[];
};

export function newProtocolRowId() {
  return `pr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_SCHEDULE_ROWS: Array<
  Pick<WorkOrderScheduleRow, "serviceMaterial" | "juraHifi" | "sfFilter">
> = [
  {
    serviceMaterial: "Motorölfilter",
    juraHifi: "SO 242",
    sfFilter: "SP 4384",
  },
  {
    serviceMaterial: "Luftfilter außen",
    juraHifi: "SA 17088",
    sfFilter: "SL 8390",
  },
  {
    serviceMaterial: "Luftfilter innen",
    juraHifi: "SA 17089",
    sfFilter: "SL 8391",
  },
  {
    serviceMaterial: "Dieselfilter",
    juraHifi: "SN 904530",
    sfFilter: "SK 3470",
  },
  {
    serviceMaterial: "Dieselfilter_Pumpe",
    juraHifi: "SN 30017",
    sfFilter: "SK 3380/1",
  },
  {
    serviceMaterial: "Entlüftungsfilter",
    juraHifi: "SAO 5313",
    sfFilter: "SOE 530",
  },
];

const DEFAULT_REPAIR_GROUPS: Array<{
  title: string;
  items: Array<{ label: string; tone?: WorkOrderRepairItem["tone"] }>;
}> = [
  {
    title: "Servicematerial",
    items: [
      { label: "Motorölfilter" },
      { label: "Kraftstofffilter" },
      { label: "Luftfilter_außen" },
      { label: "Luftfilter_innen" },
      { label: "Hydraulikfilter_Rücklauf" },
      { label: "Hydraulikfilter_Vorlauf" },
      { label: "Hydraulikfilter_Verdichter" },
      { label: "Ölseparator/Feinabscheider" },
      { label: "Service & Wartung durchgeführt !", tone: "blue" },
      { label: "Prüfungsaktualisierung", tone: "green" },
    ],
  },
  {
    title: "Checkliste",
    items: [
      { label: "Motorölstand kontrolliert" },
      { label: "Hydraulikölstand kontrolliert" },
      { label: "Bremsfunktion kontrolliert" },
      { label: "Kühlflüssigkeit kontrolliert" },
      { label: "Beleuchtung kontrolliert" },
      { label: "Reifendruck kontrolliert" },
      { label: "Maschine abgeschmiert" },
      { label: "Alle Filter kontrolliert" },
      { label: "Check und Funktionskontrolle !", tone: "blue" },
    ],
  },
  {
    title: "Fenster & Türen",
    items: [
      { label: "Frontscheibe_oben" },
      { label: "Frontscheibe_unten" },
      { label: "Türscheibe_oben" },
      { label: "Türscheibe_unten" },
      { label: "Heckscheibe" },
      { label: "Fahrertür_komplett" },
      { label: "Kabinenfenster_rechts" },
      { label: "Dachscheibe" },
      { label: "Gummiketten" },
      { label: "Reifen-Dichtmittel eingefüllt" },
    ],
  },
  {
    title: "Diverse Ersatzteile",
    items: [
      { label: "Arbeitsscheinwerfer_Kabine" },
      { label: "Arbeitsscheinwerfer_Arm" },
      { label: "Starter erneuert" },
      { label: "Lichtmaschine erneuert" },
      { label: "Kraftstoff_Förderpumpe" },
      { label: "Kraftstoff_Einspritzpumpe" },
      { label: "Spiegel/Drehlicht/SW-Stange" },
      { label: "Hydraulikzylinder" },
      { label: "Hydraulikschlauch" },
      { label: "Batterie getauscht" },
    ],
  },
];

export function createDefaultProtocol(): WorkOrderProtocol {
  return {
    motorOilFillLiters: "8 Liter",
    serviceSchedule: DEFAULT_SCHEDULE_ROWS.map((row) => ({
      id: newProtocolRowId(),
      serviceMaterial: row.serviceMaterial,
      juraHifi: row.juraHifi,
      sfFilter: row.sfFilter,
      lagerTeilId: null,
      menge: 1,
      lagerstandSnapshot: null,
    })),
    repairGroups: DEFAULT_REPAIR_GROUPS.map((group) => ({
      id: newProtocolRowId(),
      title: group.title,
      items: group.items.map((item) => ({
        id: newProtocolRowId(),
        label: item.label,
        checked: false,
        tone: item.tone ?? "default",
      })),
    })),
  };
}

function normalizeScheduleRow(raw: Record<string, unknown>): WorkOrderScheduleRow {
  const lagerTeilId =
    typeof raw.lagerTeilId === "string" && raw.lagerTeilId.trim()
      ? raw.lagerTeilId.trim()
      : null;
  const lagerstandRaw = raw.lagerstandSnapshot ?? raw.lagerstand;
  const lagerstandSnapshot =
    lagerstandRaw === null || lagerstandRaw === undefined || lagerstandRaw === ""
      ? null
      : normalizeScheduleMenge(lagerstandRaw);

  return {
    id: String(raw.id ?? newProtocolRowId()),
    serviceMaterial: String(raw.serviceMaterial ?? ""),
    juraHifi: String(raw.juraHifi ?? ""),
    sfFilter: String(raw.sfFilter ?? ""),
    lagerTeilId,
    menge: normalizeScheduleMenge(raw.menge ?? (lagerTeilId ? 1 : 0)),
    lagerstandSnapshot,
    lagerIssuedMenge: normalizeScheduleMenge(raw.lagerIssuedMenge ?? 0),
  };
}

function normalizeRepairItem(raw: Record<string, unknown>): WorkOrderRepairItem {
  const tone = raw.tone;
  return {
    id: String(raw.id ?? newProtocolRowId()),
    label: String(raw.label ?? ""),
    checked: Boolean(raw.checked),
    tone: tone === "blue" || tone === "green" ? tone : "default",
  };
}

function normalizeRepairGroup(raw: Record<string, unknown>): WorkOrderRepairGroup {
  const items = Array.isArray(raw.items) ? raw.items : [];
  return {
    id: String(raw.id ?? newProtocolRowId()),
    title: String(raw.title ?? ""),
    items: items
      .filter((item) => item && typeof item === "object")
      .map((item) => normalizeRepairItem(item as Record<string, unknown>)),
  };
}

export function normalizeProtocol(
  raw: unknown,
  legacyServiceParts?: Array<{
    serviceMaterial?: string;
    juraHifi?: string;
    sfFilter?: string;
    lagerTeilId?: string | null;
    menge?: number;
  }>
): WorkOrderProtocol {
  const defaults = createDefaultProtocol();

  if (!raw || typeof raw !== "object") {
    if (legacyServiceParts?.length) {
      return {
        ...defaults,
        serviceSchedule: legacyServiceParts.map((part) =>
          normalizeScheduleRow({
            serviceMaterial: part.serviceMaterial,
            juraHifi: part.juraHifi,
            sfFilter: part.sfFilter,
            lagerTeilId: part.lagerTeilId,
            menge: part.menge,
          })
        ),
      };
    }
    return defaults;
  }

  const record = raw as Record<string, unknown>;
  const schedule = Array.isArray(record.serviceSchedule)
    ? record.serviceSchedule
        .filter((row) => row && typeof row === "object")
        .map((row) => normalizeScheduleRow(row as Record<string, unknown>))
    : legacyServiceParts?.length
      ? legacyServiceParts.map((part) =>
          normalizeScheduleRow({
            serviceMaterial: part.serviceMaterial,
            juraHifi: part.juraHifi,
            sfFilter: part.sfFilter,
            lagerTeilId: part.lagerTeilId,
            menge: part.menge,
          })
        )
      : defaults.serviceSchedule;

  const repairGroups = Array.isArray(record.repairGroups)
    ? record.repairGroups
        .filter((group) => group && typeof group === "object")
        .map((group) => normalizeRepairGroup(group as Record<string, unknown>))
    : defaults.repairGroups;

  return {
    motorOilFillLiters:
      String(record.motorOilFillLiters ?? "").trim() || defaults.motorOilFillLiters,
    serviceSchedule: schedule.length ? schedule : defaults.serviceSchedule,
    repairGroups: repairGroups.length ? repairGroups : defaults.repairGroups,
  };
}

export function linkProtocolToLager(
  protocol: WorkOrderProtocol,
  teile: LagerTeil[]
): WorkOrderProtocol {
  return {
    ...protocol,
    serviceSchedule: protocol.serviceSchedule.map((row) => {
      if (row.lagerTeilId) return row;
      const match = findLagerTeilByHersteller(teile, row.juraHifi);
      if (!match) return row;
      return {
        ...row,
        lagerTeilId: match.id,
        lagerstandSnapshot: Number(match.lagerstand ?? 0),
        menge: row.menge > 0 ? row.menge : 1,
      };
    }),
  };
}

export function protocolIssueLines(protocol: WorkOrderProtocol) {
  return protocol.serviceSchedule
    .filter(
      (row) =>
        row.lagerTeilId &&
        row.menge > normalizeScheduleMenge(row.lagerIssuedMenge ?? 0)
    )
    .map((row) => ({
      lagerTeilId: row.lagerTeilId as string,
      menge: row.menge - normalizeScheduleMenge(row.lagerIssuedMenge ?? 0),
      herstellernummer: row.juraHifi,
      bemerkung: row.serviceMaterial,
    }));
}

type IssueResult = {
  protocol: WorkOrderProtocol;
  error: { message: string } | null;
  issuedCount: number;
};

export async function issueProtocolStockDelta(
  machineId: string,
  protocol: WorkOrderProtocol,
  referenz: string
): Promise<IssueResult> {
  const lines = protocolIssueLines(protocol);
  if (!lines.length) {
    return { protocol, error: null, issuedCount: 0 };
  }

  const { data, error } = await issueLagerStock({
    machineId,
    referenz,
    lines,
  });

  if (error) {
    return { protocol, error, issuedCount: 0 };
  }

  const issued = Array.isArray(data?.issued) ? data.issued : [];
  const stockById = new Map<string, number>();
  for (const row of issued) {
    if (row?.lagerTeilId != null) {
      stockById.set(String(row.lagerTeilId), Number(row.lagerstand ?? 0));
    }
  }

  const updatedSchedule = protocol.serviceSchedule.map((row) => {
    if (!row.lagerTeilId) return row;
    const hit = issued.find((item) => String(item.lagerTeilId) === row.lagerTeilId);
    if (!hit) return row;
    return {
      ...row,
      lagerIssuedMenge: row.menge,
      lagerstandSnapshot: stockById.get(row.lagerTeilId) ?? row.lagerstandSnapshot,
    };
  });

  return {
    protocol: { ...protocol, serviceSchedule: updatedSchedule },
    error: null,
    issuedCount: issued.length,
  };
}
