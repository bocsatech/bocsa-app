import type {
  KundeSnapshot,
  RechnungDraft,
  RechnungKostenart,
  RechnungMwstModus,
  RechnungPosition,
  RechnungPosTyp,
  RechnungPositionSourceType,
} from "./types/rechnung";
import { germanToday } from "./dates";

export type { Rechnung, RechnungDraft, RechnungListItem, RechnungPosition } from "./types/rechnung";
export { kundeToSnapshot, fahrzeugToSnapshot } from "./types/rechnung";

export function formatEuro(value: number) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatRechnungDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

export function formatKundeLabel(snapshot: KundeSnapshot) {
  const person = [snapshot.anrede, snapshot.titel, snapshot.vorname, snapshot.nachname]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (snapshot.firma?.trim()) {
    return person ? `${snapshot.firma.trim()} (${person})` : snapshot.firma.trim();
  }
  return person || "—";
}

export function formatKundeAddress(snapshot: KundeSnapshot) {
  const lines = [
    formatKundeLabel(snapshot),
    snapshot.strasse?.trim(),
    [snapshot.plz, snapshot.ort].filter(Boolean).join(" ").trim(),
    snapshot.land?.trim(),
  ].filter(Boolean);
  return lines;
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function calcPositionNetto(
  menge: number,
  einzelpreis: number,
  rabattProzent: number,
  posTyp: RechnungPosTyp
) {
  if (posTyp === "titel") return 0;
  const base = Number(menge) * Number(einzelpreis);
  const net = base * (1 - Number(rabattProzent) / 100);
  if (posTyp === "abzug") return -Math.abs(roundMoney(net));
  return roundMoney(net);
}

export function calcRechnungTotals(
  positionen: RechnungPosition[],
  mwstModus: RechnungMwstModus,
  abzugExtra = 0
) {
  let zwischensumme = 0;
  let ust19Base = 0;
  let ust7Base = 0;

  for (const row of positionen) {
    if (row.pos_typ === "titel") continue;
    const net = calcPositionNetto(
      row.menge,
      row.einzelpreis_netto,
      row.rabatt_prozent,
      row.pos_typ
    );
    zwischensumme += net;
    if (row.pos_typ === "position") {
      if (row.ust_satz >= 18.5) ust19Base += net;
      else if (row.ust_satz >= 6.5) ust7Base += net;
    }
  }

  zwischensumme = roundMoney(zwischensumme);
  const abzug = roundMoney(Math.abs(abzugExtra));
  const netAfterAbzug = roundMoney(zwischensumme - abzug);

  let ust_19 = 0;
  let ust_7 = 0;
  let rechnungsbetrag = netAfterAbzug;

  if (mwstModus === "zuzueglich") {
    ust_19 = roundMoney(ust19Base * 0.19);
    ust_7 = roundMoney(ust7Base * 0.07);
    rechnungsbetrag = roundMoney(netAfterAbzug + ust_19 + ust_7);
  } else if (mwstModus === "inklusive") {
    ust_19 = roundMoney((ust19Base * 0.19) / 1.19);
    ust_7 = roundMoney((ust7Base * 0.07) / 1.07);
    rechnungsbetrag = netAfterAbzug;
  }

  return {
    zwischensumme_netto: zwischensumme,
    abzug,
    ust_19,
    ust_7,
    rechnungsbetrag,
  };
}

export function newPosition(partial?: Partial<RechnungPosition>): RechnungPosition {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `pos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    position_nr: partial?.position_nr ?? 1,
    pos_typ: partial?.pos_typ ?? "position",
    kostenart: partial?.kostenart ?? "material",
    menge: partial?.menge ?? 1,
    einheit: partial?.einheit ?? "Stk",
    bezeichnung: partial?.bezeichnung ?? "",
    einzelpreis_netto: partial?.einzelpreis_netto ?? 0,
    rabatt_prozent: partial?.rabatt_prozent ?? 0,
    positionspreis_netto: partial?.positionspreis_netto ?? 0,
    ust_satz: partial?.ust_satz ?? 19,
    source_type: partial?.source_type ?? "manual",
    source_ref: partial?.source_ref ?? null,
    lager_teil_id: partial?.lager_teil_id ?? null,
    sort_order: partial?.sort_order ?? 0,
  };
}

export function renumberPositions(rows: RechnungPosition[]) {
  let nr = 0;
  return rows.map((row, index) => {
    const next = { ...row, sort_order: index };
    if (row.pos_typ === "titel") {
      return { ...next, position_nr: nr };
    }
    nr += 1;
    const positionspreis_netto = calcPositionNetto(
      next.menge,
      next.einzelpreis_netto,
      next.rabatt_prozent,
      next.pos_typ
    );
    return { ...next, position_nr: nr, positionspreis_netto };
  });
}

export function createEmptyRechnungDraft(bearbeiter?: string): RechnungDraft {
  const today = germanToday();
  return {
    rechnungs_nr: "",
    belegdatum: today,
    faelligkeitsdatum: today,
    status: "entwurf",
    kunde_id: null,
    kunde_snapshot: {},
    pkw_fahrzeug_id: null,
    fahrzeug_snapshot: null,
    source_type: "manual",
    source_ref: null,
    mwst_modus: "zuzueglich",
    leistungsdatum: today,
    bestellnr: null,
    lieferbedingung: null,
    notiz: null,
    zahlungshinweis: null,
    footer_hinweis:
      "Die Radschrauben müssen nach 50–100 km auf festen Sitz überprüft werden.",
    zwischensumme_netto: 0,
    ust_19: 0,
    ust_7: 0,
    abzug: 0,
    rechnungsbetrag: 0,
    bearbeiter: bearbeiter ?? null,
    positionen: [],
  };
}

export const RECHNUNG_STATUS_OPTIONS = [
  { value: "entwurf", label: "Entwurf" },
  { value: "offen", label: "Offen" },
  { value: "bezahlt", label: "Bezahlt" },
  { value: "storniert", label: "Storniert" },
] as const;

export const RECHNUNG_MWST_OPTIONS = [
  { value: "zuzueglich", label: "Zuzüglich MwSt." },
  { value: "inklusive", label: "Inklusive MwSt." },
  { value: "ohne", label: "Ohne MwSt." },
] as const;

export const RECHNUNG_KOSTENART_OPTIONS: { value: RechnungKostenart; label: string }[] = [
  { value: "material", label: "Material" },
  { value: "lohn", label: "Lohn" },
  { value: "durchlaufend", label: "durchl. Posten" },
  { value: "sonstige", label: "Sonstige" },
];

export const RECHNUNG_EINHEIT_OPTIONS = ["Stk", "Std", "Liter", "Paar", "pau"] as const;

async function parseJson<T>(response: Response): Promise<{ data: T | null; error: string | null }> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `HTTP ${response.status}`;
    return { data: null, error: message };
  }
  return { data: payload as T, error: null };
}

export async function fetchRechnungen() {
  const response = await fetch(`/api/rechnungen?ts=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  return parseJson<{ rechnungen: import("./types/rechnung").RechnungListItem[] }>(response);
}

export async function fetchRechnung(id: string) {
  const response = await fetch(`/api/rechnungen/${id}?ts=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  return parseJson<{ rechnung: import("./types/rechnung").Rechnung }>(response);
}

export async function fetchNextRechnungsNr(belegdatum: string) {
  const response = await fetch(
    `/api/rechnungen/next-nr?belegdatum=${encodeURIComponent(belegdatum)}&ts=${Date.now()}`,
    { cache: "no-store", credentials: "include" }
  );
  return parseJson<{ rechnungsNr: string }>(response);
}

export async function saveRechnung(body: Record<string, unknown>, id?: string) {
  const response = await fetch(id ? `/api/rechnungen/${id}` : "/api/rechnungen", {
    method: id ? "PATCH" : "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<{ rechnung: import("./types/rechnung").Rechnung }>(response);
}

export async function deleteRechnung(id: string) {
  const response = await fetch(`/api/rechnungen/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseJson<{ ok: boolean }>(response);
}

export {
  mergeImportedPositions,
  positionsFromBauArbeitsauftrag,
  positionsFromPkwArbeitsauftrag,
} from "./rechnung-import";

export function positionFromLagerTeil(
  teil: {
    id: string;
    bezeichnung?: string | null;
    herstellernummer: string;
    verkaufspreis?: number | null;
    listenpreis_netto?: number | null;
  },
  sortOrder: number
): RechnungPosition {
  const preis = teil.verkaufspreis ?? teil.listenpreis_netto ?? 0;
  return newPosition({
    pos_typ: "position",
    kostenart: "material",
    bezeichnung: [teil.bezeichnung, teil.herstellernummer].filter(Boolean).join(" — ") || "Teil",
    einzelpreis_netto: Number(preis) || 0,
    menge: 1,
    einheit: "Stk",
    source_type: "lager_teil",
    lager_teil_id: teil.id,
    source_ref: { lagerTeilId: teil.id },
    sort_order: sortOrder,
  });
}
