export type GeraetenummerCodeEntry = {
  code: string;
  label?: string;
};

export type GeraetenummerKlasseEntry = GeraetenummerCodeEntry & {
  geraettyp: string;
};

export type GeraetenummerArtEntry = GeraetenummerCodeEntry;

export type GeraetenummerCodesConfig = {
  marken: GeraetenummerCodeEntry[];
  klassen: GeraetenummerKlasseEntry[];
  arten: GeraetenummerArtEntry[];
};

export type GeraetenummerPick = {
  marke: string;
  klasse: string;
  art: string;
};

export const GERAETENUMMER_SETTINGS_KEY = "geraetenummer_codes";
export const GERAETENUMMER_SEQ_DIGITS = 5;

export const DEFAULT_GERAETENUMMER_CODES: GeraetenummerCodesConfig = {
  marken: [
    { code: "WN", label: "Wacker Neuson" },
    { code: "KB", label: "Kubota" },
    { code: "BS", label: "Bomag" },
    { code: "RA", label: "Rammer" },
    { code: "AC", label: "AC" },
  ],
  klassen: [
    { code: "KG", label: "Kleingerät", geraettyp: "Kleingerät" },
    { code: "GG", label: "Großgerät", geraettyp: "Großgerät" },
    { code: "EG", label: "Elektrogerät", geraettyp: "Elektrogerät" },
    { code: "PK", label: "PKW", geraettyp: "PKW" },
  ],
  arten: [
    { code: "ST1", label: "Stampfer 1" },
    { code: "ST2", label: "Stampfer 2" },
    { code: "WVG", label: "Wacker Vibrogerte" },
    { code: "WVP", label: "Wacker Vibrationsplatte" },
    { code: "BRM", label: "Bormag" },
    { code: "WSM", label: "WSM" },
    { code: "RP1", label: "Rüttelplatte 1" },
    { code: "RP2", label: "Rüttelplatte 2" },
  ],
};

export function normalizeGeraetenummerCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

export function buildGeraetenummerPrefix(pick: GeraetenummerPick) {
  const marke = normalizeGeraetenummerCode(pick.marke);
  const klasse = normalizeGeraetenummerCode(pick.klasse);
  const art = normalizeGeraetenummerCode(pick.art);
  if (!marke || !klasse || !art) return "";
  return `${marke}-${klasse}-${art}`;
}

export function formatGeraetenummerSequence(value: number) {
  const safe = Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
  return String(safe).padStart(GERAETENUMMER_SEQ_DIGITS, "0");
}

export function composeGeraetenummer(pick: GeraetenummerPick, sequence: number) {
  const prefix = buildGeraetenummerPrefix(pick);
  if (!prefix) return "";
  return `${prefix}-${formatGeraetenummerSequence(sequence)}`;
}

export function parseStructuredGeraetenummer(value: unknown): {
  marke: string;
  klasse: string;
  art: string;
  sequence: number;
} | null {
  const text = String(value ?? "").trim();
  const match = text.match(/^([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9]+)-(\d{5})$/i);
  if (!match) return null;
  return {
    marke: match[1].toUpperCase(),
    klasse: match[2].toUpperCase(),
    art: match[3].toUpperCase(),
    sequence: Number.parseInt(match[4], 10),
  };
}

export function mergeGeraetenummerCodes(
  stored: Partial<GeraetenummerCodesConfig> | null | undefined
): GeraetenummerCodesConfig {
  return {
    marken: mergeCodeList(DEFAULT_GERAETENUMMER_CODES.marken, stored?.marken),
    klassen: mergeKlasseList(DEFAULT_GERAETENUMMER_CODES.klassen, stored?.klassen),
    arten: mergeCodeList(DEFAULT_GERAETENUMMER_CODES.arten, stored?.arten),
  };
}

function mergeCodeList<T extends GeraetenummerCodeEntry>(
  defaults: T[],
  extra: T[] | undefined
): T[] {
  const map = new Map<string, T>();
  for (const entry of defaults) {
    map.set(normalizeGeraetenummerCode(entry.code), { ...entry, code: normalizeGeraetenummerCode(entry.code) });
  }
  for (const entry of extra ?? []) {
    const code = normalizeGeraetenummerCode(entry.code);
    if (!code) continue;
    map.set(code, { ...entry, code });
  }
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function mergeKlasseList(
  defaults: GeraetenummerKlasseEntry[],
  extra: GeraetenummerKlasseEntry[] | undefined
) {
  return mergeCodeList(defaults, extra).map((entry) => {
    const fromDefault = defaults.find(
      (item) => normalizeGeraetenummerCode(item.code) === entry.code
    );
    const fromExtra = extra?.find(
      (item) => normalizeGeraetenummerCode(item.code) === entry.code
    );
    return {
      ...entry,
      geraettyp:
        (fromExtra as GeraetenummerKlasseEntry | undefined)?.geraettyp ??
        (fromDefault as GeraetenummerKlasseEntry | undefined)?.geraettyp ??
        entry.label ??
        entry.code,
    };
  });
}

export function geraettypForKlasse(
  codes: GeraetenummerCodesConfig,
  klasseCode: string
) {
  const klasse = normalizeGeraetenummerCode(klasseCode);
  return (
    codes.klassen.find((entry) => normalizeGeraetenummerCode(entry.code) === klasse)
      ?.geraettyp ?? ""
  );
}

export async function fetchGeraetenummerCodes() {
  const response = await fetch(`/api/geraetenummer/codes?ts=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      data: null,
      error: { message: result?.error ?? "Codes konnten nicht geladen werden." },
    };
  }
  return { data: mergeGeraetenummerCodes(result), error: null };
}

export async function fetchNextGeraetenummer(pick: GeraetenummerPick) {
  const params = new URLSearchParams({
    marke: pick.marke,
    klasse: pick.klasse,
    art: pick.art,
    ts: String(Date.now()),
  });
  const response = await fetch(`/api/geraetenummer/next?${params}`, {
    cache: "no-store",
    credentials: "include",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      data: null,
      error: { message: result?.error ?? "Nächste Nummer konnte nicht geladen werden." },
    };
  }
  return {
    data: result as { prefix: string; sequence: number; geraetenummer: string },
    error: null,
  };
}

export async function addGeraetenummerCodeEntry(payload: {
  category: "marken" | "klassen" | "arten";
  code: string;
  label?: string;
  geraettyp?: string;
}) {
  const response = await fetch("/api/geraetenummer/codes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      data: null,
      error: { message: result?.error ?? "Code konnte nicht gespeichert werden." },
    };
  }
  return { data: mergeGeraetenummerCodes(result), error: null };
}

export function validateGeraetenummerPick(
  codes: GeraetenummerCodesConfig,
  pick: GeraetenummerPick
) {
  const marke = normalizeGeraetenummerCode(pick.marke);
  const klasse = normalizeGeraetenummerCode(pick.klasse);
  const art = normalizeGeraetenummerCode(pick.art);

  if (!marke || !klasse || !art) {
    return "Marke, Klasse und Gerätetyp müssen gewählt werden.";
  }
  if (!codes.marken.some((entry) => entry.code === marke)) {
    return `Unbekannte Marke: ${marke}`;
  }
  if (!codes.klassen.some((entry) => entry.code === klasse)) {
    return `Unbekannte Klasse: ${klasse}`;
  }
  if (!codes.arten.some((entry) => entry.code === art)) {
    return `Unbekannter Gerätetyp: ${art}`;
  }
  return null;
}
