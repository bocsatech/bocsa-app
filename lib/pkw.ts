import type {
  Kunde,
  PkwBuchung,
  PkwFahrzeug,
  PkwGruppeVorlage,
  PkwServiceArt,
  PkwSlotOption,
  PkwTeamUser,
} from "./types/pkw";

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

export type PkwFahrzeugFormField = {
  key: keyof PkwFahrzeug;
  label: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal";
  type?: "text" | "date";
};

export const FAHRZEUG_FORM_SECTIONS: Array<{
  title: string;
  fields: PkwFahrzeugFormField[];
}> = [
  {
    title: "Fahrzeugdaten",
    fields: [
      { key: "kennzeichen", label: "Kennzeichen", required: true, placeholder: "z. B. W 1234 AB" },
      { key: "gruppe", label: "PKW-Gruppe", placeholder: "z. B. VW-Passat" },
      { key: "marke", label: "Marke", placeholder: "z. B. VW" },
      { key: "modell", label: "Modell", placeholder: "z. B. Golf" },
      { key: "fin", label: "FIN (Fahrzeug-Ident.-Nr.)", placeholder: "17-stellige FIN" },
      { key: "baujahr", label: "Baujahr", placeholder: "z. B. 2019" },
      { key: "farbe", label: "Farbe" },
      { key: "kraftstoff", label: "Kraftstoff", placeholder: "Benzin, Diesel, Elektro …" },
      { key: "leistung_kw", label: "Leistung (kW)", inputMode: "decimal", placeholder: "z. B. 85" },
      { key: "km_stand", label: "Km-Stand", inputMode: "numeric", placeholder: "z. B. 87400" },
      { key: "paragraf_57a_gultig_bis", label: "§57a gültig bis", type: "date" },
    ],
  },
  {
    title: "Sonstiges",
    fields: [{ key: "notizen", label: "Notizen" }],
  },
];

/** Alle Formularfelder (ohne QR-Token — wird vom System vergeben) */
export const FAHRZEUG_FORM_FIELDS: PkwFahrzeugFormField[] = FAHRZEUG_FORM_SECTIONS.flatMap(
  (s) => s.fields
);

export function getPkwPortalBuchungsUrl(qrToken: string, origin?: string) {
  const base =
    origin?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "";
  return `${base}/pkw/buchen?token=${encodeURIComponent(qrToken)}`;
}

export const BUCHUNG_SOURCE_LABELS: Record<string, string> = {
  portal: "Kundenportal",
  buero: "Büro",
};

import { formatPkwReifenListeKurz } from "./pkw-reifen";

export function formatPkwReifenKurz(fz: Parameters<typeof formatPkwReifenListeKurz>[0]) {
  return formatPkwReifenListeKurz(fz);
}

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

export async function fetchPkwFahrzeugById(id: string) {
  const response = await fetch(`/api/pkw/fahrzeuge/${id}?ts=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  return parseJson<PkwFahrzeug>(response);
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

export async function deletePkwFahrzeug(id: string) {
  const response = await fetch(`/api/pkw/fahrzeuge/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseJson<{ ok: true }>(response);
}

export function confirmDeletePkwFahrzeug(kennzeichen: string) {
  return window.confirm(
    `Fahrzeug „${kennzeichen.trim()}" endgültig löschen?\n\nStammdaten und QR-Code werden entfernt. Bestehende Termine bleiben ohne Fahrzeug-Verknüpfung erhalten.\n\nDieser Vorgang kann nicht rückgängig gemacht werden.`
  );
}

export async function fetchPkwBuchungen(params?: {
  from?: string;
  to?: string;
  status?: string;
  fahrzeug_id?: string;
}) {
  const search = new URLSearchParams();
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  if (params?.status) search.set("status", params.status);
  if (params?.fahrzeug_id) search.set("fahrzeug_id", params.fahrzeug_id);
  const q = search.toString();
  const response = await fetch(`/api/pkw/buchungen?${q}&ts=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  return parseJson<PkwBuchung[]>(response);
}

export async function fetchPkwFahrzeugBuchungen(fahrzeugId: string) {
  const response = await fetch(`/api/pkw/fahrzeuge/${fahrzeugId}/buchungen?ts=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  return parseJson<PkwBuchung[]>(response);
}

export async function createPkwBuchung(payload: {
  kennzeichen: string;
  slot_start: string;
  slot_end: string;
  fahrzeug_id?: string | null;
  kunde_id?: string | null;
  km_stand?: number | null;
  servicearten?: string[];
  problem_text?: string | null;
  platz_nummer?: number | null;
  status?: PkwBuchung["status"];
  assigned_user_id?: string | null;
  internal_notes?: string | null;
  munkafolyamat?: PkwBuchung["munkafolyamat"];
  /** Lager-Teile am verknüpften Fahrzeug (für Lager-Meldungen PKW-Bedarf) */
  ersatzteile?: import("./types/maintenance").MaintenanceLagerLink[];
}) {
  const response = await fetch("/api/pkw/buchungen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return parseJson<PkwBuchung>(response);
}

export async function updatePkwBuchung(
  id: string,
  payload: Partial<PkwBuchung> & { auto_platz?: boolean }
) {
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

export async function createPkwServiceArt(payload: { label: string; key?: string }) {
  const response = await fetch("/api/pkw/servicearten", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return parseJson<PkwServiceArt>(response);
}

export async function fetchPkwTeam() {
  const response = await fetch(`/api/pkw/team?ts=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  return parseJson<PkwTeamUser[]>(response);
}

/** PKW-Werkstatt: 07:00–17:00 (für UI-Hinweise) */
export const PKW_SERVICE_HOURS = { von: 7, bis: 17 } as const;

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

export async function portalPkwLogout() {
  const response = await fetch("/api/pkw/portal/logout", {
    method: "POST",
    credentials: "include",
  });
  return parseJson<{ ok: boolean }>(response);
}

export const PKW_PORTAL_VISIT_KEY = "pkw_portal_visit";

export function markPkwPortalVisit() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(PKW_PORTAL_VISIT_KEY, "1");
}

export function clearPkwPortalVisit() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(PKW_PORTAL_VISIT_KEY);
}

export function hasPkwPortalVisit() {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(PKW_PORTAL_VISIT_KEY) === "1";
}

/** Zuverlässig beim Tab-Schließen (pagehide), wenn fetch abgebrochen wird. */
export function portalPkwLogoutBeacon() {
  const url = "/api/pkw/portal/logout";
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([], { type: "text/plain" }));
    return;
  }
  void fetch(url, { method: "POST", credentials: "include", keepalive: true });
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
    timeZone: "Europe/Vienna",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dateYmdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function localDayStartIso(dateYmd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return "";
  return new Date(`${dateYmd}T00:00:00`).toISOString();
}

export function localDayEndIso(dateYmd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return "";
  return new Date(`${dateYmd}T23:59:59.999`).toISOString();
}

export function buchungRangeParams(fromYmd: string, toYmd: string) {
  const from = localDayStartIso(fromYmd);
  const to = localDayEndIso(toYmd || fromYmd);
  return { from, to };
}

export const BUCHUNG_STATUS_LABELS: Record<string, string> = {
  angefragt: "Angefragt",
  bestaetigt: "Bestätigt",
  in_arbeit: "In Arbeit",
  fertig: "Fertig",
  abgesagt: "Abgesagt",
};

export function normalizePkwGruppeKey(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

export async function fetchPkwGruppenOverview() {
  const response = await fetch(`/api/pkw/gruppen?ts=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  return parseJson<{ gruppen: string[]; templates: PkwGruppeVorlage[] }>(response);
}

export async function fetchPkwGruppeVorlage(gruppe: string) {
  const response = await fetch(
    `/api/pkw/gruppen/${encodeURIComponent(gruppe)}?ts=${Date.now()}`,
    { cache: "no-store", credentials: "include" }
  );
  return parseJson<PkwGruppeVorlage>(response);
}

export async function savePkwGruppeVorlage(
  gruppe: string,
  payload: {
    bezeichnung?: string | null;
    ersatzteile?: import("./types/maintenance").MaintenanceLagerLink[] | null;
  }
) {
  const response = await fetch(`/api/pkw/gruppen/${encodeURIComponent(gruppe)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return parseJson<PkwGruppeVorlage>(response);
}
