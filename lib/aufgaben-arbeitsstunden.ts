import { formatGermanDate, normalizeGermanDate } from "./dates";
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

function normalizeUser(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function orderDatum(order: { date?: string; updatedAt?: string }) {
  return (
    normalizeGermanDate(order.date?.trim() ?? "") ||
    formatGermanDate(order.updatedAt?.slice(0, 10) ?? "")
  );
}

function orderMatchesUser(
  order: { updatedBy?: string; createdBy?: string },
  userNorm: string
) {
  const label = normalizeUser(workOrderUserLabel(order));
  return Boolean(label && label === userNorm);
}

export function collectAufgabenStundenFromAuftraege(
  machines: Machine[],
  fahrzeuge: PkwFahrzeug[],
  username: string
): AufgabenStundenTag[] {
  const userNorm = normalizeUser(username);
  const byDay = new Map<string, AufgabenStundenEintrag[]>();

  for (const order of collectAllWorkOrders(machines)) {
    if (!orderMatchesUser(order, userNorm)) continue;
    const stunden = parseWorkHours(order.workHours);
    if (stunden <= 0) continue;

    const datum = orderDatum(order);
    if (!datum) continue;

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
    if (!orderMatchesUser(order, userNorm)) continue;
    const stunden = parseWorkHours(order.workHours);
    if (stunden <= 0) continue;

    const datum = orderDatum(order);
    if (!datum) continue;

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
    .sort((a, b) => {
      const cmp = b.datum.localeCompare(a.datum, "de");
      return cmp !== 0 ? cmp : 0;
    });
}

export function formatAufgabenStunden(value: number) {
  return value.toLocaleString("de-AT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
