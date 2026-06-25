import type { Machine } from "./types/machine";

function normalizeForMatch(value: string) {
  return value.toLowerCase().replace(/[\s\-_/\\.]+/g, "");
}

function tokenizeQuery(query: string) {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function collectMachineTabDataValues(tabData: Record<string, unknown> | null | undefined) {
  if (!tabData || typeof tabData !== "object") return [];
  return Object.values(tabData)
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

/** Egy gépből kereshető szöveg (Stammdaten + motor + tab_data). */
export function machineSearchBlob(machine: Machine) {
  const parts = [
    machine.id,
    machine.geraetenummer,
    machine.bezeichnung,
    machine.serial_number,
    machine.subgroup,
    machine.geraettyp,
    machine.depot,
    machine.baujahr,
    machine.km_stand,
    machine.license_plate,
    machine.damage_status,
    machine.meldung_status,
    machine.status,
    machine.prufung,
    machine.elektro_ove,
    machine.intern_8_11,
    machine.section_57a,
    machine.tpg_hebetechnik,
    machine.last_service_date,
    machine.last_service_by,
    machine.antifreeze_checked_at,
    machine.hour_meter_changed_at,
    machine.description,
    machine.engine_type,
    machine.engine_number,
    machine.emission_standard,
    machine.engine_oil_type,
    machine.hydraulic_oil_type,
    machine.hour_meter_reading,
    machine.old_hour_meter_reading,
    machine.engine_power_kw,
    machine.net_weight,
    machine.total_width,
    machine.total_height,
    machine.total_length,
    ...collectMachineTabDataValues(machine.machine_tab_data),
  ];

  return parts
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(" ");
}

type ScoredMachine = { machine: Machine; score: number };

function scoreMachine(machine: Machine, tokens: string[], rawQuery: string): ScoredMachine | null {
  const blob = machineSearchBlob(machine).toLowerCase();
  const normBlob = normalizeForMatch(blob);
  let score = 0;

  for (const token of tokens) {
    const normToken = normalizeForMatch(token);
    if (blob.includes(token)) {
      score += 12;
      continue;
    }
    if (normToken && normBlob.includes(normToken)) {
      score += 8;
      continue;
    }
    return null;
  }

  const q = rawQuery.trim().toLowerCase();
  const geraetenummer = String(machine.geraetenummer ?? "").toLowerCase();
  const serial = String(machine.serial_number ?? "").toLowerCase();
  const bezeichnung = String(machine.bezeichnung ?? "").toLowerCase();

  if (geraetenummer && geraetenummer === q) score += 200;
  if (serial && serial === q) score += 180;
  if (geraetenummer.startsWith(q)) score += 40;
  if (serial.startsWith(q)) score += 35;
  if (bezeichnung.startsWith(q)) score += 20;
  if (geraetenummer.includes(q)) score += 15;
  if (serial.includes(q)) score += 12;

  return { machine, score };
}

/** Token-alapú keresés rangsorolással (IDE quick-open jelleg). */
export function searchMachines(machines: Machine[], query: string) {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return machines;

  return machines
    .map((machine) => scoreMachine(machine, tokens, query))
    .filter((entry): entry is ScoredMachine => entry !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aNum = String(a.machine.geraetenummer ?? "");
      const bNum = String(b.machine.geraetenummer ?? "");
      return aNum.localeCompare(bNum, "de");
    })
    .map((entry) => entry.machine);
}

/** @deprecated Használd a searchMachines-t — visszafelé kompatibilitás. */
export function filterMachines(machines: Machine[], query: string) {
  return searchMachines(machines, query);
}
