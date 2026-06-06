import {
  formatGermanDate,
  germanDateComparable,
  germanToday,
  isGermanDateInRange,
  normalizeGermanDate,
} from "./dates";
import { periodRange } from "./arbeitsstunden";
import { collectAllPkwWorkOrders } from "./pkw-work-orders";
import type { PkwFahrzeug } from "./types/pkw";
import type { Machine } from "./types/machine";
import {
  collectAllWorkOrders,
  formatOrderType,
  formatWorkOrderAuftragNr,
  parseWorkHours,
  workOrderUserLabel,
} from "./work-orders";

export type AuftragStundenPeriod = "alle" | "tag" | "woche" | "monat" | "intervall";

export type AufgabenStundenEintrag = {
  datum: string;
  stunden: number;
  auftragNr: string;
  auftragTyp: string;
  referenz: string;
  bezeichnung: string;
  workOrderId: string;
  quelle: "maschine" | "pkw";
};

export type AufgabenStundenTag = {
  datum: string;
  gesamtStunden: number;
  eintraege: AufgabenStundenEintrag[];
};

function normalizeUserKey(value: string) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildUserMatchKeys(username: string, fullName?: string | null) {
  const keys = new Set<string>();
  const userKey = normalizeUserKey(username);
  if (userKey) keys.add(userKey);
  const nameKey = normalizeUserKey(fullName ?? "");
  if (nameKey) keys.add(nameKey);
  return [...keys];
}

function orderDatum(order: { date?: string; updatedAt?: string }) {
  return (
    normalizeGermanDate(order.date?.trim() ?? "") ||
    formatGermanDate(order.updatedAt?.slice(0, 10) ?? "")
  );
}

function orderMatchesUser(
  order: { updatedBy?: string; createdBy?: string },
  userKeys: string[]
) {
  const label = normalizeUserKey(workOrderUserLabel(order));
  if (!label || userKeys.length === 0) return false;

  return userKeys.some((key) => {
    if (!key) return false;
    return label === key || label.includes(key) || key.includes(label);
  });
}

export function resolveAuftragStundenRange(
  period: AuftragStundenPeriod,
  anchorDe: string,
  customFrom?: string,
  customTo?: string
): { from: string; to: string } | null {
  if (period === "alle") {
    return null;
  }

  if (period === "intervall") {
    const from = normalizeGermanDate(customFrom ?? "") || germanToday();
    const to = normalizeGermanDate(customTo ?? "") || from;
    if (germanDateComparable(from) > germanDateComparable(to)) {
      return { from: to, to: from };
    }
    return { from, to };
  }

  const anchor = normalizeGermanDate(anchorDe) || germanToday();
  if (period === "tag") return periodRange("tag", anchor);
  if (period === "woche") return periodRange("woche", anchor);
  return periodRange("monat", anchor);
}

export function collectAufgabenStundenFromAuftraege(
  machines: Machine[],
  fahrzeuge: PkwFahrzeug[],
  userKeys: string[],
  range?: { from: string; to: string }
): AufgabenStundenTag[] {
  const byDay = new Map<string, AufgabenStundenEintrag[]>();

  for (const order of collectAllWorkOrders(machines)) {
    if (!orderMatchesUser(order, userKeys)) continue;
    const stunden = parseWorkHours(order.workHours);
    if (stunden <= 0) continue;

    const datum = orderDatum(order);
    if (!datum) continue;
    if (range && !isGermanDateInRange(datum, range.from, range.to)) continue;

    const entry: AufgabenStundenEintrag = {
      datum,
      stunden,
      auftragNr: formatWorkOrderAuftragNr(order),
      auftragTyp: formatOrderType(order.type),
      referenz: order.geraetenummer || "—",
      bezeichnung: order.bezeichnung?.trim() || order.repairDescription?.trim() || "—",
      workOrderId: order.id,
      quelle: "maschine",
    };

    const list = byDay.get(datum) ?? [];
    list.push(entry);
    byDay.set(datum, list);
  }

  for (const order of collectAllPkwWorkOrders(fahrzeuge)) {
    if (!orderMatchesUser(order, userKeys)) continue;
    const stunden = parseWorkHours(order.workHours);
    if (stunden <= 0) continue;

    const datum = orderDatum(order);
    if (!datum) continue;
    if (range && !isGermanDateInRange(datum, range.from, range.to)) continue;

    const entry: AufgabenStundenEintrag = {
      datum,
      stunden,
      auftragNr: formatWorkOrderAuftragNr(order),
      auftragTyp: formatOrderType(order.type),
      referenz: order.kennzeichen || "—",
      bezeichnung: order.bezeichnung?.trim() || order.kunde?.trim() || "—",
      workOrderId: order.id,
      quelle: "pkw",
    };

    const list = byDay.get(datum) ?? [];
    list.push(entry);
    byDay.set(datum, list);
  }

  return [...byDay.entries()]
    .map(([datum, eintraege]) => ({
      datum,
      gesamtStunden: Math.round(eintraege.reduce((sum, row) => sum + row.stunden, 0) * 100) / 100,
      eintraege: eintraege.sort((a, b) => b.stunden - a.stunden),
    }))
    .sort((a, b) => germanDateComparable(b.datum).localeCompare(germanDateComparable(a.datum)));
}

export function formatAufgabenStunden(value: number) {
  return value.toLocaleString("de-AT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
