import {
  applyGruppenTabDefaultsToTabData,
  normalizeSubgroupKey,
} from "./geraetgruppe-protokoll.ts";
import {
  bodyHasExplicitSubgroup,
  deriveGeraetegruppeFromGeraetenummer,
  isStructuredGeraetenummer,
} from "./geraetenummer.ts";
import { loadVorlage } from "./geraetgruppe-protokoll-server.mjs";

/**
 * Neue Maschine: Gerätegruppe immer aus Gerätenummer (wenn strukturiert).
 */
export function applySubgroupForNewMachine(patch) {
  const geraetenummer = patch.geraetenummer;
  if (!isStructuredGeraetenummer(geraetenummer)) return patch;
  patch.subgroup = deriveGeraetegruppeFromGeraetenummer(geraetenummer) || null;
  return patch;
}

/** Neue Maschine: Motor, Technische Daten, Schmierstoffe aus Gerätegruppen-Vorlage. */
export async function applyGruppenTabDefaultsForNewMachine(supabase, patch) {
  const subgroup = normalizeSubgroupKey(patch.subgroup);
  if (!subgroup || !supabase) return patch;

  const { data, error } = await loadVorlage(supabase, subgroup);
  if (error || !data?.vorlage) return patch;

  const tabData =
    patch.machine_tab_data && typeof patch.machine_tab_data === "object"
      ? patch.machine_tab_data
      : {};

  patch.machine_tab_data = applyGruppenTabDefaultsToTabData(tabData, data.vorlage);
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
