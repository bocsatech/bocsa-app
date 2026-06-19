import { collectAllWorkOrders, parseWorkHours, workOrderUserLabel, formatWorkOrderAuftragNr } from "./work-orders";
import type { WorkOrderListEntry } from "./work-orders";
import {
  formatGermanDate,
  germanToday,
  isGermanDateInRange,
  listGermanDatesInRange,
  normalizeGermanDate,
  parseGermanDate,
} from "./dates";
import type { Machine } from "./types/machine";

export const SOLL_STUNDEN_PRO_TAG = 10;
export const ARBEITSZEIT_VON = "07:00";
export const ARBEITSZEIT_BIS = "17:00";

export type ArbeitsstundenQuelle = "protokoll" | "manuell";

export type ArbeitsstundenEintrag = {
  id: string;
  username: string;
  depot: string;
  datum: string;
  quelle: ArbeitsstundenQuelle;
  stunden: number;
  beschreibung: string;
  machineId: string | null;
  workOrderId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ArbeitsstundenTagesabschluss = {
  username: string;
  datum: string;
  depot: string;
  sollStunden: number;
  arbeitszeitVon: string;
  arbeitszeitBis: string;
  bestaetigt: boolean;
  bestaetigtAm: string | null;
  notiz: string;
};

export type PeriodKind = "tag" | "woche" | "monat" | "jahr";

export type DaySummary = {
  datum: string;
  username: string;
  depot: string;
  protokollStunden: number;
  manuellStunden: number;
  gesamtStunden: number;
  sollStunden: number;
  differenz: number;
  bestaetigt: boolean;
  eintragCount: number;
};

export type AggregateRow = {
  key: string;
  label: string;
  protokollStunden: number;
  manuellStunden: number;
  gesamtStunden: number;
  sollStunden: number;
  differenz: number;
  tage: number;
  bestaetigteTage: number;
};

export function parseStundenInput(value: string): number | null {
  const trimmed = String(value ?? "").trim().replace(/\s*h$/i, "");
  if (!trimmed) return null;
  const normalized = trimmed.replace(",", ".");
  const num = Number(normalized);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100) / 100;
}

export function formatStunden(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("de-AT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** @deprecated Alias — TT.MM.JJJJ */
export function isoToday(): string {
  return germanToday();
}

export function periodRange(kind: PeriodKind, anchorDe: string): { from: string; to: string } {
  const anchor =
    normalizeGermanDate(anchorDe) ||
    formatGermanDate(anchorDe) ||
    germanToday();
  const date = parseGermanDate(anchor);
  if (!date) return { from: anchor, to: anchor };

  const y = date.getFullYear();
  const m = date.getMonth() + 1;

  if (kind === "tag") {
    return { from: anchor, to: anchor };
  }

  if (kind === "woche") {
    const day = date.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      from: formatGermanDate(monday),
      to: formatGermanDate(sunday),
    };
  }

  if (kind === "monat") {
    const from = formatGermanDate(new Date(y, m - 1, 1));
    const last = new Date(y, m, 0).getDate();
    const to = formatGermanDate(new Date(y, m - 1, last));
    return { from, to };
  }

  return {
    from: formatGermanDate(new Date(y, 0, 1)),
    to: formatGermanDate(new Date(y, 11, 31)),
  };
}

export function listDatesInRange(fromDe: string, toDe: string): string[] {
  return listGermanDatesInRange(fromDe, toDe);
}

export function workDaysInRange(fromDe: string, toDe: string): number {
  return listDatesInRange(fromDe, toDe).filter((datum) => {
    const day = parseGermanDate(datum)?.getDay();
    return day !== undefined && day !== 0 && day !== 6;
  }).length;
}

export function collectProtokollEintraege(
  machines: Machine[],
  username: string,
  datumDe: string
): Array<Omit<ArbeitsstundenEintrag, "id" | "createdAt" | "updatedAt">> {
  const userNorm = normalizeUser(username);
  const entries: Array<Omit<ArbeitsstundenEintrag, "id" | "createdAt" | "updatedAt">> = [];

  for (const order of collectAllWorkOrders(machines)) {
    if (!orderMatchesUserAndDate(order, userNorm, datumDe)) continue;

    const stunden = parseWorkHours(order.workHours);
    if (stunden <= 0) continue;

    entries.push({
      username,
      depot: order.filiale || "",
      datum: datumDe,
      quelle: "protokoll",
      stunden,
      beschreibung: `${formatOrderLabel(order)} · ${order.geraetenummer}`,
      machineId: order.machineId,
      workOrderId: order.id,
    });
  }

  return entries;
}

function formatOrderLabel(order: WorkOrderListEntry) {
  const nr = formatWorkOrderAuftragNr(order);
  const type = order.type?.trim() || "Auftrag";
  const typeLabel = type === "Reperatur" ? "Reparatur" : type;
  if (nr && nr !== "—") return `${nr} · ${typeLabel}`;
  return typeLabel;
}

function orderMatchesUserAndDate(
  order: WorkOrderListEntry,
  userNorm: string,
  datumDe: string
) {
  const orderUser = normalizeUser(workOrderUserLabel(order));
  if (!orderUser || orderUser !== userNorm) return false;

  const orderDate =
    normalizeGermanDate(order.date?.trim() ?? "") ||
    formatGermanDate(order.updatedAt?.slice(0, 10) ?? "");

  return orderDate === datumDe;
}

function normalizeUser(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function sumByQuelle(
  entries: Pick<ArbeitsstundenEintrag, "quelle" | "stunden">[]
): { protokoll: number; manuell: number; gesamt: number } {
  let protokoll = 0;
  let manuell = 0;
  for (const entry of entries) {
    if (entry.quelle === "protokoll") protokoll += entry.stunden;
    else manuell += entry.stunden;
  }
  const gesamt = Math.round((protokoll + manuell) * 100) / 100;
  return {
    protokoll: Math.round(protokoll * 100) / 100,
    manuell: Math.round(manuell * 100) / 100,
    gesamt,
  };
}

export function buildDaySummary(
  entries: ArbeitsstundenEintrag[],
  abschluss: ArbeitsstundenTagesabschluss | null,
  username: string,
  datumDe: string
): DaySummary {
  const dayEntries = entries.filter(
    (e) => e.username === username && e.datum === datumDe
  );
  const sums = sumByQuelle(dayEntries);
  const soll = abschluss?.sollStunden ?? SOLL_STUNDEN_PRO_TAG;
  const depot =
    abschluss?.depot ||
    dayEntries.find((e) => e.depot)?.depot ||
    "";

  return {
    datum: datumDe,
    username,
    depot,
    protokollStunden: sums.protokoll,
    manuellStunden: sums.manuell,
    gesamtStunden: sums.gesamt,
    sollStunden: soll,
    differenz: Math.round((sums.gesamt - soll) * 100) / 100,
    bestaetigt: Boolean(abschluss?.bestaetigt),
    eintragCount: dayEntries.length,
  };
}

export function aggregateByKey(
  entries: ArbeitsstundenEintrag[],
  abschluesse: ArbeitsstundenTagesabschluss[],
  fromDe: string,
  toDe: string,
  groupBy: "username" | "depot"
): AggregateRow[] {
  const workDays = workDaysInRange(fromDe, toDe);
  const sollPerDay = SOLL_STUNDEN_PRO_TAG;
  const map = new Map<string, AggregateRow>();

  function ensure(key: string, label: string) {
    if (!map.has(key)) {
      map.set(key, {
        key,
        label,
        protokollStunden: 0,
        manuellStunden: 0,
        gesamtStunden: 0,
        sollStunden: 0,
        differenz: 0,
        tage: 0,
        bestaetigteTage: 0,
      });
    }
    return map.get(key)!;
  }

  for (const entry of entries) {
    if (!isGermanDateInRange(entry.datum, fromDe, toDe)) continue;
    const key =
      groupBy === "depot"
        ? entry.depot.trim() || "— ohne Werkstatt —"
        : entry.username;
    const row = ensure(key, key);
    if (entry.quelle === "protokoll") row.protokollStunden += entry.stunden;
    else row.manuellStunden += entry.stunden;
    row.gesamtStunden += entry.stunden;
  }

  for (const abschluss of abschluesse) {
    if (!isGermanDateInRange(abschluss.datum, fromDe, toDe)) continue;
    const key =
      groupBy === "depot"
        ? abschluss.depot.trim() || "— ohne Werkstatt —"
        : abschluss.username;
    ensure(key, key);
    if (abschluss.bestaetigt) {
      const row = map.get(key)!;
      row.bestaetigteTage += 1;
    }
  }

  for (const row of map.values()) {
    row.protokollStunden = Math.round(row.protokollStunden * 100) / 100;
    row.manuellStunden = Math.round(row.manuellStunden * 100) / 100;
    row.gesamtStunden = Math.round(row.gesamtStunden * 100) / 100;
    row.tage = workDays;
    row.sollStunden = Math.round(workDays * sollPerDay * 100) / 100;
    row.differenz = Math.round((row.gesamtStunden - row.sollStunden) * 100) / 100;
  }

  return [...map.values()].sort((a, b) => b.gesamtStunden - a.gesamtStunden);
}

export function mapDbEintrag(row: Record<string, unknown>): ArbeitsstundenEintrag {
  return {
    id: String(row.id),
    username: String(row.username ?? ""),
    depot: String(row.depot ?? ""),
    datum: formatGermanDate(row.datum) || String(row.datum ?? "").trim(),
    quelle: row.quelle === "manuell" ? "manuell" : "protokoll",
    stunden: Number(row.stunden ?? 0),
    beschreibung: String(row.beschreibung ?? ""),
    machineId: row.machine_id ? String(row.machine_id) : null,
    workOrderId: row.work_order_id ? String(row.work_order_id) : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export function mapDbAbschluss(row: Record<string, unknown>): ArbeitsstundenTagesabschluss {
  return {
    username: String(row.username ?? ""),
    datum: formatGermanDate(row.datum) || String(row.datum ?? "").trim(),
    depot: String(row.depot ?? ""),
    sollStunden: Number(row.soll_stunden ?? SOLL_STUNDEN_PRO_TAG),
    arbeitszeitVon: String(row.arbeitszeit_von ?? ARBEITSZEIT_VON).slice(0, 5),
    arbeitszeitBis: String(row.arbeitszeit_bis ?? ARBEITSZEIT_BIS).slice(0, 5),
    bestaetigt: Boolean(row.bestaetigt),
    bestaetigtAm: row.bestaetigt_am ? String(row.bestaetigt_am) : null,
    notiz: String(row.notiz ?? ""),
  };
}
