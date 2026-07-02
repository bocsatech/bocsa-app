import type { Machine } from "./types/machine";
import type { Kunde, PkwFahrzeug } from "./types/pkw";
import { formatKundeName } from "./pkw";
import { getPkwWorkOrders } from "./pkw-work-orders";
import type { WorkOrder } from "./work-orders";
import { formatWorkOrderAuftragNr } from "./work-orders";
import type { LagerTeil } from "./types/lager";

const SEARCH_SKIP_KEYS = new Set([
  "portal_pin_hash",
  "password_hash",
  "bild",
  "image",
]);

export function normalizeRechnungSearchText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesRechnungSearch(haystack: string, query: string) {
  const normalizedHaystack = normalizeRechnungSearchText(haystack);
  const tokens = normalizeRechnungSearchText(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((token) => normalizedHaystack.includes(token));
}

export function collectSearchValues(value: unknown, depth = 0, key?: string): string[] {
  if (key && SEARCH_SKIP_KEYS.has(key)) return [];
  if (depth > 4 || value == null) return [];

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectSearchValues(item, depth + 1, String(index)));
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([entryKey, entryValue]) =>
      collectSearchValues(entryValue, depth + 1, entryKey)
    );
  }

  return [];
}

export function kundeSearchText(kunde: Kunde, fahrzeuge: PkwFahrzeug[] = []) {
  const relatedFahrzeuge = fahrzeuge.filter((fahrzeug) => fahrzeug.kunde_id === kunde.id);
  const parts = [
    ...collectSearchValues(kunde),
    formatKundeName(kunde),
    kundeOptionLabel(kunde),
  ];

  for (const fahrzeug of relatedFahrzeuge) {
    parts.push(...collectSearchValues(fahrzeug));
    parts.push(fahrzeugOptionLabel(fahrzeug));
    for (const order of getPkwWorkOrders(fahrzeug)) {
      parts.push(workOrderSearchText(order));
    }
  }

  return parts.filter(Boolean).join(" ");
}

export function kundeOptionLabel(kunde: Kunde) {
  const parts = [formatKundeName(kunde)];
  if (kunde.kundennummer?.trim()) parts.push(`#${kunde.kundennummer.trim()}`);
  if (kunde.email?.trim()) parts.push(kunde.email.trim());
  if (kunde.telefon?.trim()) parts.push(kunde.telefon.trim());
  if (kunde.mobil?.trim()) parts.push(kunde.mobil.trim());
  if (kunde.ort?.trim()) parts.push(kunde.ort.trim());
  if (kunde.strasse?.trim()) parts.push(kunde.strasse.trim());
  return parts.join(" · ");
}

export function fahrzeugSearchText(fahrzeug: PkwFahrzeug) {
  const parts = [
    ...collectSearchValues(fahrzeug),
    formatKundeName(fahrzeug.kunde ?? null),
    fahrzeugOptionLabel(fahrzeug),
  ];

  for (const order of getPkwWorkOrders(fahrzeug)) {
    parts.push(workOrderSearchText(order));
  }

  return parts.filter(Boolean).join(" ");
}

export function fahrzeugOptionLabel(fahrzeug: PkwFahrzeug) {
  const vehicle = [fahrzeug.kennzeichen, fahrzeug.marke, fahrzeug.modell, fahrzeug.fin]
    .filter(Boolean)
    .join(" · ");
  const kunde = fahrzeug.kunde ? formatKundeName(fahrzeug.kunde) : null;
  return kunde ? `${vehicle} (${kunde})` : vehicle;
}

export function machineSearchText(machine: Machine) {
  return [
    ...collectSearchValues(machine),
    machineOptionLabel(machine),
  ]
    .filter(Boolean)
    .join(" ");
}

export function machineOptionLabel(machine: Machine) {
  const main = machine.geraetenummer || machine.bezeichnung || machine.id;
  const parts = [main];
  if (machine.bezeichnung && machine.geraetenummer) parts.push(machine.bezeichnung);
  if (machine.depot?.trim()) parts.push(machine.depot.trim());
  if (machine.subgroup?.trim()) parts.push(machine.subgroup.trim());
  return parts.join(" · ");
}

export function workOrderSearchText(order: WorkOrder) {
  return [
    ...collectSearchValues(order),
    formatWorkOrderAuftragNr(order),
    workOrderOptionLabel(order),
  ]
    .filter(Boolean)
    .join(" ");
}

export function workOrderOptionLabel(order: WorkOrder) {
  const nr = formatWorkOrderAuftragNr(order) || order.id;
  const desc = order.repairDescription?.trim().slice(0, 48);
  return [nr, order.date, desc].filter(Boolean).join(" · ");
}

export function lagerTeilSearchText(teil: LagerTeil) {
  return [
    ...collectSearchValues(teil),
    lagerTeilOptionLabel(teil),
  ]
    .filter(Boolean)
    .join(" ");
}

export function lagerTeilOptionLabel(teil: LagerTeil) {
  return [teil.bezeichnung || teil.herstellernummer, teil.herstellernummer, teil.lagerort, teil.lieferant]
    .filter(Boolean)
    .join(" — ");
}
