import type { Machine } from "./types/machine";
import { GERAETTYP_OPTIONS, toAustriaDateString, toIsoDateString } from "./machines";

export type PruefprotokollCheckItem = {
  code: string;
  label: string;
  sectionId: string;
  checked: boolean;
};

export type PruefprotokollGeraetedaten = {
  betreiber: string;
  baujahr: string;
  maschinenart: string;
  pruefdatum: string;
  /** Nur manuell — nicht aus Maschinenstamm */
  betrStdKm: string;
  herstellerTyp: string;
  datumLetztePruefung: string;
  fahrgestellnummer: string;
  seriennummer: string;
  geraetenummer: string;
};

export type PruefprotokollErgebnis = {
  entsprichtJa: boolean;
  plaketteNr: string;
  maengelText: string;
  behobeneMaengel: string;
  arbeitnehmerInformiert: boolean;
  ortDerPruefung: string;
  unterschriftUrl: string | null;
};

export type Pruefprotokoll = {
  id: string;
  pruefdatum: string;
  geraetedaten: PruefprotokollGeraetedaten;
  checklist: PruefprotokollCheckItem[];
  ergebnis: PruefprotokollErgebnis;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
};

export type PruefprotokollListEntry = Pruefprotokoll & {
  machineId: string;
  geraetenummer: string;
  filiale: string;
  geraettyp: string;
  bezeichnung: string;
};

export type PruefprotokollListFilters = {
  geraetenummer: string;
  dateFrom: string;
  dateTo: string;
  user: string;
  filiale: string;
  geraettyp: string;
};

export const EMPTY_PRUEFPROTOKOLL_FILTERS: PruefprotokollListFilters = {
  geraetenummer: "",
  dateFrom: "",
  dateTo: "",
  user: "",
  filiale: "",
  geraettyp: "",
};

export { GERAETTYP_OPTIONS };

type SectionDef = {
  id: string;
  title: string;
  items: Array<[string, string]>;
};

const SECTIONS: SectionDef[] = [
  {
    id: "2.1",
    title: "Grundgerät",
    items: [
      ["211", "Rahmen"],
      ["212", "Achsaufhängung"],
      ["213", "Lagerungen"],
      ["214", "Verkleidungen"],
      ["215", "Kraftübertragung"],
      ["216", "Gegengewichte"],
      ["217", "Drehkranz"],
      ["218", "Anhängevorrichtung"],
      ["219", "Abstützeinrichtungen"],
    ],
  },
  {
    id: "2.2",
    title: "Druckluftanlage",
    items: [
      ["221", "Kompressoren"],
      ["222", "Luftbehälter"],
      ["223", "Ventile"],
      ["224", "Leitungen"],
      ["225", "Schläuche"],
      ["226", "Zylinder"],
      ["227", "Bremsanlage"],
    ],
  },
  {
    id: "2.3",
    title: "Antriebsstrang",
    items: [
      ["231", "Motor"],
      ["232", "Abgasanlage"],
      ["233", "Kraftstofftank"],
      ["234", "Starteinrichtung"],
      ["235", "Schalldämmung"],
      ["236", "Motorregelung"],
      ["237", "Getriebe"],
      ["238", "Kupplung"],
      ["239", "Schaltungen"],
      ["240", "Bremsen"],
    ],
  },
  {
    id: "2.4",
    title: "Elektrische Anlage",
    items: [
      ["241", "Lichtmaschine"],
      ["242", "Batterien"],
      ["243", "Schalter"],
      ["244", "Leitungen"],
      ["245", "Sicherungen"],
      ["246", "Beleuchtung"],
      ["247", "Blink-, Brems-, Schlusslicht"],
      ["248", "Signaleinrichtungen"],
      ["249", "Bauteile mit gefährlicher Spannung"],
    ],
  },
  {
    id: "2.5",
    title: "Fahrwerk",
    items: [
      ["251", "Achsen / Achsblockierung"],
      ["252", "Räder / Bereifung"],
      ["253", "Kettenfahrwerk"],
      ["254", "Kardanwelle"],
    ],
  },
  {
    id: "2.6",
    title: "Steuereinrichtung",
    items: [
      ["261", "Steuereinrichtung"],
      ["262", "Lenkung"],
      ["263", "Knicklenkung"],
      ["264", "Hebelartierung"],
    ],
  },
  {
    id: "2.7",
    title: "Ausrüstung",
    items: [
      ["271", "Hubarme / Kipparm"],
      ["272", "Ausleger / Stiel"],
      ["273", "Löffel / Schaufel"],
      ["274", "stehende Seile"],
      ["275", "Schaufel / Löffel"],
      ["276", "Sicherheitshaken"],
      ["277", "Anbaugeräte"],
      ["278", "Schnellwechseleinrichtung"],
      ["279", "Kontrollanzeigen"],
    ],
  },
  {
    id: "2.8",
    title: "Fahrerhaus",
    items: [
      ["281", "Türen/Fenster"],
      ["282", "Sicht/Verglasung"],
      ["283", "Scheibenwisch-/Waschanlage"],
      ["284", "Spiegel"],
      ["285", "Sitz"],
      ["286", "Heizung/Lüftung"],
      ["287", "Schalldämmung"],
      ["288", "Haltegurte/-bügel"],
      ["289", "ROPS-/FOPS-Ausrüstung"],
    ],
  },
  {
    id: "2.9",
    title: "Hydraulik",
    items: [
      ["291", "Ölbehälter"],
      ["292", "Pumpen"],
      ["293", "Ventile"],
      ["294", "Leitungen"],
      ["295", "Schläuche"],
      ["296", "Zylinder"],
    ],
  },
  {
    id: "2.10",
    title: "Schutzeinrichtungen",
    items: [
      ["2101", "Verkleidungen"],
      ["2102", "Abdeckungen"],
      ["2103", "Klappen"],
      ["2104", "Schutzdach"],
      ["2105", "Arretierungen für Zylinder"],
      ["2106", "Knickgelenkarretierung"],
      ["2107", "Transport-/Haltebolzen"],
      ["2108", "KFG-Einrichtung"],
      ["2109", "Überlastwarneinrichtung"],
      ["2110", "Rohrbruchsicherung"],
      ["2111", "Vorlegekeile"],
      ["2112", "Aufstieghilfen"],
      ["2113", "Absturzsicherer"],
      ["2114", "Endschalter"],
      ["2115", "Notausschalter"],
      ["2116", "Schlüsselschalter"],
      ["2117", "Totmannschalter"],
    ],
  },
  {
    id: "2.11",
    title: "Schilder",
    items: [
      ["901", "Typenschild"],
      ["902", "CE-Kennzeichnung"],
      ["903", "ggf. weitere Prüfzeichen"],
      ["904", "Lärmkennzeichnung"],
    ],
  },
  {
    id: "2.12",
    title: "Wartung",
    items: [
      ["905", "Schmierplan"],
      ["906", "Wartungsbuch §16"],
      ["907", "Gesamtpflegezustand"],
    ],
  },
  {
    id: "2.13",
    title: "Allgemeines",
    items: [
      ["908", "Sonstiges"],
      ["909", "Betriebsanleitung"],
      ["910", "Ausbildung Fahrer"],
      ["911", "Mängel laut Fahrer"],
      ["912", "Leckagen"],
      ["913", "Risse"],
      ["914", "Sonstiges"],
    ],
  },
];

export const PRUEFPROTOKOLL_SECTIONS = SECTIONS;

export function newPruefprotokollId() {
  return `pp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultChecklist(
  existing?: PruefprotokollCheckItem[]
): PruefprotokollCheckItem[] {
  const byCode = new Map(existing?.map((item) => [item.code, item]) ?? []);
  const items: PruefprotokollCheckItem[] = [];
  for (const section of SECTIONS) {
    for (const [code, label] of section.items) {
      const prev = byCode.get(code);
      items.push({
        code,
        label: prev?.label ?? label,
        sectionId: section.id,
        checked: prev?.checked ?? false,
      });
    }
  }
  return items;
}

export function machineToGeraetedaten(
  machine: Machine,
  partial?: Partial<PruefprotokollGeraetedaten>
): PruefprotokollGeraetedaten {
  const tab = (machine.machine_tab_data ?? {}) as Record<string, unknown>;
  const herstellerParts = [machine.bezeichnung, machine.engine_type]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  return {
    betreiber: partial?.betreiber ?? String(machine.depot ?? "").trim(),
    baujahr: partial?.baujahr ?? String(machine.baujahr ?? "").trim(),
    maschinenart:
      partial?.maschinenart ??
      String(machine.bezeichnung ?? machine.subgroup ?? "").trim(),
    pruefdatum: partial?.pruefdatum ?? toAustriaDateString(new Date()),
    betrStdKm: partial?.betrStdKm ?? "",
    herstellerTyp: partial?.herstellerTyp ?? herstellerParts.join(" / "),
    datumLetztePruefung:
      partial?.datumLetztePruefung ??
      toAustriaDateString(machine.intern_8_11 ?? machine.prufung ?? ""),
    fahrgestellnummer:
      partial?.fahrgestellnummer ?? String(machine.license_plate ?? "").trim(),
    seriennummer: partial?.seriennummer ?? String(machine.serial_number ?? "").trim(),
    geraetenummer:
      partial?.geraetenummer ?? String(machine.geraetenummer ?? "").trim(),
  };
}

export function createEmptyPruefprotokoll(
  machine: Machine,
  username?: string
): Pruefprotokoll {
  const stamp = new Date().toISOString();
  return {
    id: newPruefprotokollId(),
    pruefdatum: toAustriaDateString(new Date()),
    geraetedaten: machineToGeraetedaten(machine),
    checklist: createDefaultChecklist(),
    ergebnis: {
      entsprichtJa: true,
      plaketteNr: "",
      maengelText: "",
      behobeneMaengel: "",
      arbeitnehmerInformiert: false,
      ortDerPruefung: String(machine.depot ?? "").trim(),
      unterschriftUrl: null,
    },
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: username,
    updatedBy: username,
  };
}

export function normalizePruefprotokoll(raw: unknown, machine: Machine): Pruefprotokoll {
  const defaults = createEmptyPruefprotokoll(machine);
  if (!raw || typeof raw !== "object") return defaults;

  const record = raw as Record<string, unknown>;
  const geraetedatenRaw =
    record.geraetedaten && typeof record.geraetedaten === "object"
      ? (record.geraetedaten as Record<string, unknown>)
      : {};

  const checklistRaw = Array.isArray(record.checklist) ? record.checklist : [];
  const checklist = createDefaultChecklist(
    checklistRaw
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const row = item as Record<string, unknown>;
        return {
          code: String(row.code ?? ""),
          label: String(row.label ?? ""),
          sectionId: String(row.sectionId ?? ""),
          checked: Boolean(row.checked),
        };
      })
  );

  const ergebnisRaw =
    record.ergebnis && typeof record.ergebnis === "object"
      ? (record.ergebnis as Record<string, unknown>)
      : {};

  return {
    id: String(record.id ?? defaults.id),
    pruefdatum:
      toAustriaDateString(String(record.pruefdatum ?? "")) || defaults.pruefdatum,
    geraetedaten: machineToGeraetedaten(machine, {
      betreiber: String(geraetedatenRaw.betreiber ?? ""),
      baujahr: String(geraetedatenRaw.baujahr ?? ""),
      maschinenart: String(geraetedatenRaw.maschinenart ?? ""),
      pruefdatum: toAustriaDateString(String(geraetedatenRaw.pruefdatum ?? "")),
      betrStdKm: String(geraetedatenRaw.betrStdKm ?? ""),
      herstellerTyp: String(geraetedatenRaw.herstellerTyp ?? ""),
      datumLetztePruefung: toAustriaDateString(
        String(geraetedatenRaw.datumLetztePruefung ?? "")
      ),
      fahrgestellnummer: String(geraetedatenRaw.fahrgestellnummer ?? ""),
      seriennummer: String(geraetedatenRaw.seriennummer ?? ""),
      geraetenummer: String(geraetedatenRaw.geraetenummer ?? ""),
    }),
    checklist,
    ergebnis: {
      entsprichtJa: ergebnisRaw.entsprichtJa !== false,
      plaketteNr: String(ergebnisRaw.plaketteNr ?? ""),
      maengelText: String(ergebnisRaw.maengelText ?? ""),
      behobeneMaengel: String(ergebnisRaw.behobeneMaengel ?? ""),
      arbeitnehmerInformiert: Boolean(ergebnisRaw.arbeitnehmerInformiert),
      ortDerPruefung: String(ergebnisRaw.ortDerPruefung ?? ""),
      unterschriftUrl:
        typeof ergebnisRaw.unterschriftUrl === "string"
          ? ergebnisRaw.unterschriftUrl
          : null,
    },
    createdAt: String(record.createdAt ?? defaults.createdAt),
    updatedAt: String(record.updatedAt ?? defaults.updatedAt),
    createdBy: String(record.createdBy ?? defaults.createdBy ?? ""),
    updatedBy: String(record.updatedBy ?? defaults.updatedBy ?? ""),
  };
}

export function getPruefprotokolle(machine: Machine | null): Pruefprotokoll[] {
  const tabData = machine?.machine_tab_data;
  if (!tabData || typeof tabData !== "object") return [];

  const list = (tabData as Record<string, unknown>).pruefprotokolle;
  if (!Array.isArray(list)) return [];

  return list
    .filter((item) => item && typeof item === "object")
    .map((item) => normalizePruefprotokoll(item, machine!))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function machineGeraettyp(machine: Machine): string {
  const tab = machine.machine_tab_data as Record<string, unknown> | null | undefined;
  return String(machine.geraettyp ?? tab?.geraettyp ?? "").trim();
}

export function collectAllPruefprotokolle(machines: Machine[]): PruefprotokollListEntry[] {
  const entries: PruefprotokollListEntry[] = [];
  for (const machine of machines) {
    for (const protokoll of getPruefprotokolle(machine)) {
      entries.push({
        ...protokoll,
        machineId: machine.id,
        geraetenummer: String(machine.geraetenummer ?? protokoll.geraetedaten.geraetenummer),
        filiale: String(machine.depot ?? protokoll.geraetedaten.betreiber ?? ""),
        geraettyp: machineGeraettyp(machine),
        bezeichnung: String(machine.bezeichnung ?? machine.subgroup ?? ""),
      });
    }
  }
  return entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function normalizeFilter(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function filterPruefprotokollEntries(
  entries: PruefprotokollListEntry[],
  filters: PruefprotokollListFilters
) {
  const geraet = normalizeFilter(filters.geraetenummer);
  const user = normalizeFilter(filters.user);
  const filiale = normalizeFilter(filters.filiale);
  const geraettyp = normalizeFilter(filters.geraettyp);
  const dateFrom = toIsoDateString(filters.dateFrom.trim());
  const dateTo = toIsoDateString(filters.dateTo.trim());

  return entries.filter((entry) => {
    if (geraet && !normalizeFilter(entry.geraetenummer).includes(geraet)) {
      return false;
    }
    if (user) {
      const label = normalizeFilter(entry.updatedBy || entry.createdBy || "");
      if (!label.includes(user)) return false;
    }
    if (filiale && !normalizeFilter(entry.filiale).includes(filiale)) {
      return false;
    }
    if (geraettyp && !normalizeFilter(entry.geraettyp).includes(geraettyp)) {
      return false;
    }
    const pruefIso = toIsoDateString(entry.pruefdatum || entry.geraetedaten.pruefdatum);
    if (dateFrom && (!pruefIso || pruefIso < dateFrom)) return false;
    if (dateTo && (!pruefIso || pruefIso > dateTo)) return false;
    return true;
  });
}

export function mergePruefprotokoll(
  machine: Machine,
  protokoll: Pruefprotokoll,
  username?: string
): Record<string, unknown> {
  const tabData =
    machine.machine_tab_data && typeof machine.machine_tab_data === "object"
      ? { ...(machine.machine_tab_data as Record<string, unknown>) }
      : {};

  const existing = getPruefprotokolle(machine);
  const stamp = new Date().toISOString();
  const next: Pruefprotokoll = normalizePruefprotokoll(
    {
      ...protokoll,
      updatedAt: stamp,
      updatedBy: username || protokoll.updatedBy || protokoll.createdBy,
    },
    machine
  );

  const index = existing.findIndex((item) => item.id === protokoll.id);
  const pruefprotokolle =
    index >= 0
      ? existing.map((item, i) => (i === index ? next : item))
      : [next, ...existing];

  return { ...tabData, pruefprotokolle };
}

export function pruefprotokollUserLabel(entry: PruefprotokollListEntry) {
  return entry.updatedBy || entry.createdBy || "—";
}
