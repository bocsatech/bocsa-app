import type { Kunde, PkwBuchung, PkwFahrzeug, PkwServiceArt, PkwSlotOption } from "./types/pkw";

async function parseJson<T>(response: Response): Promise<{ data: T | null; error: string | null }> {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { data: null, error: (result as { error?: string }).error ?? "Anfrage fehlgeschlagen." };
  }
  return { data: result as T, error: null };
}

export const KUNDEN_FORM_FIELDS: Array<{ key: keyof Kunde; label: string; required?: boolean }> = [
  { key: "kundennummer", label: "Kundennummer" },
  { key: "anrede", label: "Anrede" },
  { key: "titel", label: "Titel" },
  { key: "vorname", label: "Vorname" },
  { key: "nachname", label: "Nachname", required: true },
  { key: "firma", label: "Firma" },
  { key: "email", label: "E-Mail" },
  { key: "telefon", label: "Telefon" },
  { key: "mobil", label: "Mobil" },
  { key: "strasse", label: "Straße" },
  { key: "plz", label: "PLZ" },
  { key: "ort", label: "Ort" },
  { key: "land", label: "Land" },
  { key: "uid_nr", label: "UID-Nr." },
  { key: "notizen", label: "Notizen" },
];

export const FAHRZEUG_FORM_FIELDS: Array<{ key: keyof PkwFahrzeug; label: string; required?: boolean }> = [
  { key: "kennzeichen", label: "Kennzeichen", required: true },
  { key: "marke", label: "Marke" },
  { key: "modell", label: "Modell" },
  { key: "fin", label: "FIN / VIN" },
  { key: "baujahr", label: "Baujahr" },
  { key: "farbe", label: "Farbe" },
  { key: "kraftstoff", label: "Kraftstoff" },
  { key: "km_stand", label: "Km-Stand" },
  { key: "notizen", label: "Notizen" },
];

export function formatKundeName(kunde: Pick<Kunde, "vorname" | "nachname" | "firma">) {
  const person = [kunde.vorname, kunde.nachname].filter(Boolean).join(" ").trim();
  if (kunde.firma?.trim()) {
    return person ? `${kunde.firma.trim()} (${person})` : kunde.firma.trim();
  }
  return person || "—";
}

export function normalizeKennzeichen(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

export async function fetchKunden() {
  const response = await fetch(`/api/pkw/kunden?ts=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  return parseJson<Kunde[]>(response);
}

export async function fetchKunde(id: string) {
  const response = await fetch(`/api/pkw/kunden/${id}?ts=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  return parseJson<Kunde & { fahrzeuge: PkwFahrzeug[] }>(response);
}

export async function saveKunde(
  payload: Partial<Kunde> & { portal_pin?: string },
  id?: string
) {
  const url = id ? `/api/pkw/kunden/${id}` : "/api/pkw/kunden";
  const response = await fetch(url, {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return parseJson<Kunde>(response);
}

export async function fetchPkwFahrzeuge(kundeId?: string) {
  const params = new URLSearchParams();
  if (kundeId) params.set("kunde_id", kundeId);
  params.set("ts", String(Date.now()));
  const response = await fetch(`/api/pkw/fahrzeuge?${params}`, {
    cache: "no-store",
    credentials: "include",
  });
  return parseJson<PkwFahrzeug[]>(response);
}

export async function savePkwFahrzeug(payload: Partial<PkwFahrzeug>, id?: string) {
  const url = id ? `/api/pkw/fahrzeuge/${id}` : "/api/pkw/fahrzeuge";
  const response = await fetch(url, {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return parseJson<PkwFahrzeug>(response);
}

export async function fetchPkwBuchungen(params?: { from?: string; to?: string; status?: string }) {
  const search = new URLSearchParams();
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  if (params?.status) search.set("status", params.status);
  const q = search.toString();
  const response = await fetch(`/api/pkw/buchungen?${q}&ts=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  return parseJson<PkwBuchung[]>(response);
}

export async function updatePkwBuchung(id: string, payload: Partial<PkwBuchung>) {
  const response = await fetch(`/api/pkw/buchungen/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return parseJson<PkwBuchung>(response);
}

export async function fetchPkwServicearten() {
  const response = await fetch(`/api/pkw/servicearten?ts=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  return parseJson<PkwServiceArt[]>(response);
}

export async function fetchPkwSlots(date: string) {
  const response = await fetch(`/api/pkw/slots?date=${encodeURIComponent(date)}&ts=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  return parseJson<PkwSlotOption[]>(response);
}

export async function portalPkwLogin(kennzeichen: string, pin: string) {
  const response = await fetch("/api/pkw/portal/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ kennzeichen, pin }),
  });
  return parseJson<{ fahrzeug: PkwFahrzeug; kunde: Kunde | null }>(response);
}

export async function portalCreateBuchung(payload: {
  kennzeichen: string;
  km_stand?: number;
  servicearten: string[];
  problem_text?: string;
  slot_start: string;
  slot_end: string;
  fahrzeug_id?: string;
}) {
  const response = await fetch("/api/pkw/portal/buchen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return parseJson<PkwBuchung>(response);
}

export function formatSlotLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("de-AT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const BUCHUNG_STATUS_LABELS: Record<string, string> = {
  angefragt: "Angefragt",
  bestaetigt: "Bestätigt",
  in_arbeit: "In Arbeit",
  fertig: "Fertig",
  abgesagt: "Abgesagt",
};
