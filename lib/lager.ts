import type { LagerTeil } from "./types/lager";

export const LAGER_FORM_FIELDS: Array<{
  key: keyof Omit<LagerTeil, "id" | "created_at" | "updated_at">;
  label: string;
  type?: "text" | "number";
  required?: boolean;
}> = [
  { key: "herstellernummer", label: "Herstellernummer", required: true },
  { key: "bezeichnung", label: "Ersatzteil" },
  { key: "produktgruppe", label: "Produktgruppe" },
  { key: "lieferant", label: "Lieferant" },
  { key: "lagerort", label: "Lagerort" },
  { key: "lagerplatz", label: "Lagerplatz" },
  { key: "lagerstand", label: "Lagerstand", type: "number" },
  { key: "listenpreis_netto", label: "Listenpreis netto", type: "number" },
  { key: "listenpreis_brutto", label: "Listenpreis Brutto", type: "number" },
  { key: "verkaufspreis", label: "Verkaufspreis", type: "number" },
  { key: "bestellstatus", label: "Bestellstatus" },
];

export const BESTELLSTATUS_OPTIONS = ["", "Offen", "Bestellt", "Geliefert", "Gesperrt"];

export async function fetchLagerTeile() {
  const response = await fetch(`/api/lager/teile?ts=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      data: null,
      error: { message: result?.error ?? "Lager konnte nicht geladen werden." },
    };
  }

  return { data: result as LagerTeil[], error: null };
}

export async function createLagerTeil(payload: Partial<LagerTeil>) {
  const response = await fetch("/api/lager/teile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      data: null,
      error: { message: result?.error ?? "Teil konnte nicht angelegt werden." },
    };
  }

  return { data: result as LagerTeil, error: null };
}

export async function updateLagerTeil(id: string, payload: Partial<LagerTeil>) {
  const response = await fetch(`/api/lager/teile/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      data: null,
      error: { message: result?.error ?? "Teil konnte nicht gespeichert werden." },
    };
  }

  return { data: result as LagerTeil, error: null };
}

export async function deleteLagerTeil(id: string) {
  const response = await fetch(`/api/lager/teile/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      error: { message: result?.error ?? "Teil konnte nicht gelöscht werden." },
    };
  }

  return { error: null };
}

export type LagerListFilters = {
  herstellernummer: string;
  bezeichnung: string;
  lagerort: string;
  lagerstand: string;
};

export const EMPTY_LAGER_FILTERS: LagerListFilters = {
  herstellernummer: "",
  bezeichnung: "",
  lagerort: "",
  lagerstand: "",
};

function compactSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function filterLagerTeileByFields(teile: LagerTeil[], filters: LagerListFilters) {
  const herst = compactSearchText(filters.herstellernummer);
  const bez = filters.bezeichnung.trim().toLowerCase();
  const ort = filters.lagerort.trim().toLowerCase();
  const standRaw = filters.lagerstand.trim().toLowerCase();

  if (!herst && !bez && !ort && !standRaw) {
    return teile;
  }

  return teile.filter((teil) => {
    if (herst) {
      const haystack = compactSearchText(String(teil.herstellernummer ?? ""));
      if (!haystack.includes(herst)) return false;
    }
    if (bez && !String(teil.bezeichnung ?? "").toLowerCase().includes(bez)) {
      return false;
    }
    if (ort && !String(teil.lagerort ?? "").toLowerCase().includes(ort)) {
      return false;
    }
    if (standRaw) {
      const standText = String(teil.lagerstand ?? "").toLowerCase();
      const standFormatted = formatLagerNumber(teil.lagerstand).toLowerCase();
      if (!standText.includes(standRaw) && !standFormatted.includes(standRaw)) {
        return false;
      }
    }
    return true;
  });
}

/** @deprecated Einzel-Suchfeld; nutze filterLagerTeileByFields */
export function filterLagerTeile(teile: LagerTeil[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return teile;

  return teile.filter((teil) =>
    [
      teil.herstellernummer,
      teil.bezeichnung,
      teil.produktgruppe,
      teil.lieferant,
      teil.lagerort,
      teil.lagerplatz,
      teil.bestellstatus,
    ].some((value) => String(value ?? "").toLowerCase().includes(q))
  );
}

export function formatLagerValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  return text || "—";
}

export function formatLagerNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return new Intl.NumberFormat("de-AT", { maximumFractionDigits: 2 }).format(number);
}

export function normalizeHerstellernummer(value: string) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_\s-]+/g, "");
}

export function buildHerstellerIndex(teile: LagerTeil[]) {
  const map = new Map<string, LagerTeil>();
  for (const teil of teile) {
    const key = normalizeHerstellernummer(teil.herstellernummer);
    if (key && !map.has(key)) map.set(key, teil);
  }
  return map;
}

export function findLagerTeilByHersteller(
  teile: LagerTeil[],
  herstellernummer: string
): LagerTeil | null {
  const key = normalizeHerstellernummer(herstellernummer);
  if (!key) return null;
  return buildHerstellerIndex(teile).get(key) ?? null;
}

export async function issueLagerStock(payload: {
  machineId?: string;
  referenz?: string;
  lines: Array<{ lagerTeilId: string; herstellernummer?: string; menge: number }>;
}) {
  const response = await fetch("/api/lager/issue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      data: null,
      error: { message: result.error ?? "Lager-Ausbuchung fehlgeschlagen." },
    };
  }

  return { data: result, error: null };
}

export function formatLagerCurrency(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(number);
}
