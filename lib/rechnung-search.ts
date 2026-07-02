import type { Machine } from "./types/machine";
import type { Kunde, PkwFahrzeug } from "./types/pkw";
import { formatKundeName } from "./pkw";
import type { WorkOrder } from "./work-orders";
import { formatWorkOrderAuftragNr } from "./work-orders";
import type { LagerTeil } from "./types/lager";

export function matchesRechnungSearch(haystack: string, query: string) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const normalized = haystack.toLowerCase();
  return tokens.every((token) => normalized.includes(token));
}

export function kundeSearchText(kunde: Kunde) {
  return [
    kunde.kundennummer,
    kunde.anrede,
    kunde.titel,
    kunde.vorname,
    kunde.nachname,
    kunde.firma,
    kunde.email,
    kunde.telefon,
    kunde.mobil,
    kunde.strasse,
    kunde.plz,
    kunde.ort,
    kunde.land,
    kunde.uid_nr,
    kunde.notizen,
    formatKundeName(kunde),
  ]
    .filter(Boolean)
    .join(" ");
}

export function kundeOptionLabel(kunde: Kunde) {
  const parts = [formatKundeName(kunde)];
  if (kunde.kundennummer?.trim()) parts.push(`#${kunde.kundennummer.trim()}`);
  if (kunde.ort?.trim()) parts.push(kunde.ort.trim());
  return parts.join(" · ");
}

export function fahrzeugSearchText(fahrzeug: PkwFahrzeug) {
  return [
    fahrzeug.kennzeichen,
    fahrzeug.marke,
    fahrzeug.modell,
    fahrzeug.fin,
    fahrzeug.baujahr,
    fahrzeug.farbe,
    fahrzeug.kraftstoff,
    fahrzeug.km_stand,
    fahrzeug.notizen,
    fahrzeug.kunde?.firma,
    fahrzeug.kunde?.vorname,
    fahrzeug.kunde?.nachname,
    fahrzeug.kunde?.kundennummer,
    formatKundeName(fahrzeug.kunde ?? null),
  ]
    .filter((value) => value != null && String(value).trim())
    .join(" ");
}

export function fahrzeugOptionLabel(fahrzeug: PkwFahrzeug) {
  const vehicle = [fahrzeug.kennzeichen, fahrzeug.marke, fahrzeug.modell].filter(Boolean).join(" · ");
  const kunde = fahrzeug.kunde ? formatKundeName(fahrzeug.kunde) : null;
  return kunde ? `${vehicle} (${kunde})` : vehicle;
}

export function machineSearchText(machine: Machine) {
  return [
    machine.geraetenummer,
    machine.bezeichnung,
    machine.depot,
    machine.subgroup,
    machine.license_plate,
    machine.serial_number,
    machine.baujahr,
    machine.status,
    machine.description,
    machine.geraettyp,
    machine.km_stand,
    machine.hour_meter_reading,
    machine.engine_type,
    machine.engine_number,
  ]
    .filter((value) => value != null && String(value).trim())
    .join(" ");
}

export function machineOptionLabel(machine: Machine) {
  const main = machine.geraetenummer || machine.bezeichnung || machine.id;
  const parts = [main];
  if (machine.bezeichnung && machine.geraetenummer) parts.push(machine.bezeichnung);
  if (machine.depot?.trim()) parts.push(machine.depot.trim());
  return parts.join(" · ");
}

export function workOrderSearchText(order: WorkOrder) {
  return [
    order.id,
    formatWorkOrderAuftragNr(order),
    order.auftragNr,
    order.date,
    order.time,
    order.type,
    order.repairDescription,
    order.notes,
    order.repairStatus,
    order.workHours,
    order.createdBy,
    order.updatedBy,
    ...(order.serviceParts ?? []).flatMap((part) => [
      part.serviceMaterial,
      part.juraHifi,
      part.sfFilter,
      part.lagerTeilId,
    ]),
  ]
    .filter((value) => value != null && String(value).trim())
    .join(" ");
}

export function workOrderOptionLabel(order: WorkOrder) {
  const nr = formatWorkOrderAuftragNr(order) || order.id;
  const desc = order.repairDescription?.trim().slice(0, 48);
  return [nr, order.date, desc].filter(Boolean).join(" · ");
}

export function lagerTeilSearchText(teil: LagerTeil) {
  return [
    teil.bezeichnung,
    teil.herstellernummer,
    teil.artikelnummer,
    teil.lagerort,
    teil.lagerplatz,
    teil.produktgruppe,
    teil.lieferant,
    teil.bestellender_kunde,
    teil.bestellender_benutzer,
    teil.bestellstatus,
    teil.verkaufspreis,
    teil.listenpreis_netto,
    teil.lagerstand,
    teil.menge_min,
    teil.menge_max,
  ]
    .filter((value) => value != null && String(value).trim())
    .join(" ");
}

export function lagerTeilOptionLabel(teil: LagerTeil) {
  return [teil.bezeichnung || teil.herstellernummer, teil.herstellernummer]
    .filter(Boolean)
    .join(" — ");
}
