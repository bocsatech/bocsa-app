import { buildArbeitsauftragDetailHref } from "./arbeitsauftrag-routes";
import { buildPkwArbeitsauftragDetailHref } from "./pkw-arbeitsauftrag-routes";
import type { LagerTeil } from "./types/lager";

const ARBEITSAUFTRAG_REFERENZ = /^Arbeitsauftrag\s+(.+)$/i;

export type LagerBewegungTyp = "entnahme" | "zugang" | "inventur";
export type LagerBewegungRichtung = "aus" | "ein";

export type LagerBewegung = {
  id: string;
  created_at: string;
  lager_teil_id: string;
  menge: number;
  typ: LagerBewegungTyp;
  richtung: LagerBewegungRichtung;
  machine_id: string | null;
  fahrzeug_id: string | null;
  arbeitsauftrag_id?: string | null;
  referenz: string | null;
  bemerkung: string | null;
  teil?: Pick<
    LagerTeil,
    "herstellernummer" | "bezeichnung" | "lagerort" | "lagerplatz" | "artikelnummer"
  > | null;
  fahrzeug_kennzeichen?: string | null;
  machine_geraetenummer?: string | null;
};

export type LagerBewegungZeitraum = "tag" | "woche" | "monat" | "frei";

export function lagerBewegungZeitraumRange(
  preset: LagerBewegungZeitraum,
  customFrom?: string,
  customTo?: string
): { from: string; to: string; label: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (preset === "frei" && customFrom && customTo) {
    return {
      from: new Date(customFrom).toISOString(),
      to: new Date(`${customTo}T23:59:59.999`).toISOString(),
      label: `${customFrom} – ${customTo}`,
    };
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (preset === "woche") {
    start.setDate(start.getDate() - 6);
    return { from: start.toISOString(), to: end.toISOString(), label: "Letzte 7 Tage" };
  }

  if (preset === "monat") {
    start.setDate(start.getDate() - 29);
    return { from: start.toISOString(), to: end.toISOString(), label: "Letzte 30 Tage" };
  }

  return { from: start.toISOString(), to: end.toISOString(), label: "Heute" };
}

export async function fetchLagerBewegungen(params: { from: string; to: string }) {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
    ts: String(Date.now()),
  });
  const response = await fetch(`/api/lager/bewegungen?${search}`, {
    cache: "no-store",
    credentials: "include",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof result?.error === "string"
        ? result.error
        : typeof result?.error?.message === "string"
          ? result.error.message
          : `Bewegungen konnten nicht geladen werden (HTTP ${response.status}).`;
    return {
      data: null,
      error: { message },
    };
  }
  return { data: result as LagerBewegung[], error: null };
}

export function bewegungTypLabel(typ: LagerBewegungTyp, richtung: LagerBewegungRichtung) {
  if (typ === "inventur") return richtung === "ein" ? "Inventur +" : "Inventur −";
  if (typ === "zugang") return "Zugang";
  return "Entnahme";
}

export function parseArbeitsauftragReferenz(referenz: string | null | undefined) {
  if (!referenz?.trim()) return null;
  const match = referenz.trim().match(ARBEITSAUFTRAG_REFERENZ);
  return match?.[1]?.trim() ?? null;
}

/** Link zum Arbeitsauftrag, Fahrzeug oder Maschine — für Lagerbewegungen-Tabelle */
export function resolveLagerBewegungHref(row: LagerBewegung): string | null {
  if (row.arbeitsauftrag_id) {
    if (row.machine_id) {
      return buildArbeitsauftragDetailHref({
        machineId: row.machine_id,
        auftragId: row.arbeitsauftrag_id,
      });
    }
    if (row.fahrzeug_id) {
      return buildPkwArbeitsauftragDetailHref({
        fahrzeugId: row.fahrzeug_id,
        auftragId: row.arbeitsauftrag_id,
      });
    }
  }

  const auftragNr = parseArbeitsauftragReferenz(row.referenz);
  if (auftragNr) {
    if (row.machine_id) {
      return buildArbeitsauftragDetailHref({ machineId: row.machine_id, auftragNr });
    }
    if (row.fahrzeug_id) {
      return buildPkwArbeitsauftragDetailHref({ fahrzeugId: row.fahrzeug_id, auftragNr });
    }
  }

  if (row.fahrzeug_id) {
    return `/pkw/fahrzeuge/${row.fahrzeug_id}`;
  }

  if (row.machine_id) {
    return `/maschinen/${row.machine_id}`;
  }

  return null;
}

export function formatBewegungDatum(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
