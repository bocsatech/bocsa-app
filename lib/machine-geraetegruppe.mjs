import {
  bodyHasExplicitSubgroup,
  deriveGeraetegruppeFromGeraetenummer,
  isStructuredGeraetenummer,
} from "./geraetenummer.ts";

/**
 * Neue Maschine: Gerätegruppe immer aus Gerätenummer (wenn strukturiert).
 */
export function applySubgroupForNewMachine(patch) {
  const geraetenummer = patch.geraetenummer;
  if (!isStructuredGeraetenummer(geraetenummer)) return patch;
  patch.subgroup = deriveGeraetegruppeFromGeraetenummer(geraetenummer) || null;
  return patch;
}

/**
 * Bestehende Maschine: nur automatisch, wenn noch keine Gerätegruppe gesetzt ist
 * und der Client keine eigene Gruppe mitsendet (Altdaten bleiben manuell editierbar).
 */
export function applySubgroupForMachineUpdate(patch, body, existing) {
  if (bodyHasExplicitSubgroup(body)) return patch;

  const existingSubgroup = String(existing?.subgroup ?? "").trim();
  if (existingSubgroup) return patch;

  const geraetenummer = patch.geraetenummer ?? existing?.geraetenummer;
  if (!isStructuredGeraetenummer(geraetenummer)) return patch;

  patch.subgroup = deriveGeraetegruppeFromGeraetenummer(geraetenummer) || null;
  return patch;
}
