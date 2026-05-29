import { parseGermanDate } from "./dates";

/** Auftrag-Nr.-Format: {Typ}{MM}.{YY}.{DepotBuchstabe}{00001} — z. B. S05.26.S00001 */
export function workOrderTypeLetter(type: string) {
  const normalized = type.trim().toLowerCase();
  if (normalized === "service") return "S";
  if (normalized === "check") return "C";
  if (normalized === "reparatur" || normalized === "reperatur") return "R";
  const first = type.trim().charAt(0);
  return first ? first.toUpperCase() : "X";
}

export function depotFirstLetter(depot: string) {
  const cleaned = depot.replace(/^depot\s+/i, "").trim();
  const match = cleaned.match(/[A-Za-zÀ-ÿÄÖÜäöüß]/);
  return match ? match[0].toUpperCase() : "X";
}

export function buildAuftragNrPrefix(
  type: string,
  depot: string,
  dateDe?: string
) {
  const date = (dateDe ? parseGermanDate(dateDe) : null) ?? new Date();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${workOrderTypeLetter(type)}${mm}.${yy}.${depotFirstLetter(depot)}`;
}

export function formatAuftragNr(prefix: string, sequence: number) {
  const seq = Math.max(1, Math.floor(sequence));
  return `${prefix}${String(seq).padStart(5, "0")}`;
}

export function isValidAuftragNr(value: string) {
  return /^[A-Z]\d{2}\.\d{2}\.[A-Z]\d{5}$/.test(value.trim());
}

export async function reserveWorkOrderAuftragNr(params: {
  type: string;
  depot: string;
  date?: string;
}): Promise<{ auftragNr: string; prefix: string }> {
  const response = await fetch("/api/arbeitsauftrag/reserve-nr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof result?.error === "string"
        ? result.error
        : "Auftrag-Nr. konnte nicht erzeugt werden."
    );
  }
  return {
    auftragNr: String(result.auftragNr ?? ""),
    prefix: String(result.prefix ?? ""),
  };
}
