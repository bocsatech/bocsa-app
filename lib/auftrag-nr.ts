import { parseGermanDate } from "./dates";
import {
  geraetenummerMachineSegment,
  isStructuredGeraetenummer,
} from "./geraetenummer";
import {
  isUserFilialeCode,
  normalizeUserFilialeCode,
  type UserFilialeCode,
} from "./user-filiale";

/** Legacy Auftrag-Nr.: S05.26.S00001 (Depot-Anfangsbuchstabe, ohne Gerät) */
export function isLegacyAuftragNr(value: string) {
  return /^[A-Z]\d{2}\.\d{2}\.[A-Z]\d{5}$/.test(value.trim());
}

/**
 * Neue Auftrag-Nr.: S06.26-S-KB-GG-BG15-00001
 * Typ + Monat.Jahr + Filiale + Marke-Klasse-Art + Laufnummer
 */
export function isNewFormatAuftragNr(value: string) {
  return /^[SCR]\d{2}\.\d{2}-[SHW]-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-\d{5}$/i.test(
    value.trim()
  );
}

export function workOrderTypeLetter(type: string) {
  const normalized = type.trim().toLowerCase();
  if (normalized === "service") return "S";
  if (normalized === "check") return "C";
  if (normalized === "reparatur" || normalized === "reperatur") return "R";
  const first = type.trim().charAt(0);
  return first ? first.toUpperCase() : "X";
}

/** @deprecated Nur für Legacy-Backfill */
export function depotFirstLetter(depot: string) {
  const cleaned = depot.replace(/^depot\s+/i, "").trim();
  const match = cleaned.match(/[A-Za-zÀ-ÿÄÖÜäöüß]/);
  return match ? match[0].toUpperCase() : "X";
}

/** @deprecated Nur für Legacy-Backfill — S05.26.S00001 */
export function buildLegacyAuftragNrPrefix(
  type: string,
  depot: string,
  dateDe?: string
) {
  const date = (dateDe ? parseGermanDate(dateDe) : null) ?? new Date();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${workOrderTypeLetter(type)}${mm}.${yy}.${depotFirstLetter(depot)}`;
}

export function buildAuftragNrPrefix(params: {
  type: string;
  filialeCode: UserFilialeCode;
  geraetenummer: string;
  dateDe?: string;
}) {
  const filialeCode = normalizeUserFilialeCode(params.filialeCode);
  if (!filialeCode) return "";

  const machineSegment = geraetenummerMachineSegment(params.geraetenummer);
  if (!machineSegment) return "";

  const date = (params.dateDe ? parseGermanDate(params.dateDe) : null) ?? new Date();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);

  return `${workOrderTypeLetter(params.type)}${mm}.${yy}-${filialeCode}-${machineSegment}`;
}

export function formatAuftragNr(prefix: string, sequence: number) {
  const seq = Math.max(1, Math.floor(sequence));
  return `${prefix}-${String(seq).padStart(5, "0")}`;
}

export function isValidAuftragNr(value: string) {
  const trimmed = value.trim();
  return isLegacyAuftragNr(trimmed) || isNewFormatAuftragNr(trimmed);
}

/** Bau-Arbeitsauftrag: neues Format; PKW/Legacy-Flag: altes Format */
export function hasEnvironmentAuftragNr(value: string, preferNewFormat: boolean) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return preferNewFormat ? isNewFormatAuftragNr(trimmed) : isLegacyAuftragNr(trimmed);
}

export function shouldAssignEnvironmentAuftragNr(
  existingNr: string,
  preferNewFormat: boolean
) {
  return !hasEnvironmentAuftragNr(existingNr, preferNewFormat);
}

export function preferNewFormatAuftragNrOnClient() {
  return true;
}

export function canAssignNewFormatAuftragNr(params: {
  geraetenummer?: string | null;
  filialeCode?: UserFilialeCode | null;
}) {
  if (!isStructuredGeraetenummer(params.geraetenummer)) {
    return {
      ok: false as const,
      error:
        "Gerätenummer muss im Format MARKE-KLASSE-ART-00001 sein (z. B. KB-GG-BG15-00001).",
    };
  }
  const filialeCode = normalizeUserFilialeCode(params.filialeCode);
  if (!filialeCode) {
    return {
      ok: false as const,
      error:
        "Filiale fehlt am Benutzerprofil. Bitte unter Benutzer eine Filiale (S/H/W) zuweisen.",
    };
  }
  return { ok: true as const, filialeCode };
}

export async function validateWorkOrderAuftragNrLocal(params: {
  auftragNr: string;
  machineId?: string;
  fahrzeugId?: string;
  orderId?: string;
}): Promise<{ ok: boolean; duplicate?: boolean; error?: string }> {
  const response = await fetch("/api/arbeitsauftrag/validate-nr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });
  const result = await response.json().catch(() => ({}));
  if (response.ok) {
    return { ok: true };
  }
  return {
    ok: false,
    duplicate: Boolean(result?.duplicate),
    error:
      typeof result?.error === "string"
        ? result.error
        : "Auftrag-Nr. konnte nicht geprüft werden.",
  };
}

export async function ensureUniqueWorkOrderAuftragNrLocal(params: {
  order: {
    id: string;
    type: string;
    depot?: string;
    date?: string;
    auftragNr?: string;
  };
  machineId?: string;
  fahrzeugId?: string;
  reserveDepot?: string;
  geraetenummer?: string;
  filialeCode?: UserFilialeCode | string;
}): Promise<{
  order: typeof params.order;
  reassigned: boolean;
  previousNr?: string;
}> {
  if (typeof window === "undefined") {
    return { order: params.order, reassigned: false };
  }

  const nr = params.order.auftragNr?.trim() ?? "";
  if (!nr) {
    return { order: params.order, reassigned: false };
  }

  const validation = await validateWorkOrderAuftragNrLocal({
    auftragNr: nr,
    machineId: params.machineId,
    fahrzeugId: params.fahrzeugId,
    orderId: params.order.id,
  });

  if (validation.ok) {
    return { order: params.order, reassigned: false };
  }

  if (validation.duplicate) {
    const { auftragNr } = await reserveWorkOrderAuftragNr({
      type: params.order.type,
      depot: params.reserveDepot || params.order.depot || "",
      date: params.order.date,
      legacy: Boolean(params.fahrzeugId),
      geraetenummer: params.geraetenummer,
      filialeCode: params.filialeCode,
    });
    return {
      order: { ...params.order, auftragNr },
      reassigned: true,
      previousNr: nr,
    };
  }

  throw new Error(validation.error ?? "Auftrag-Nr. konnte nicht geprüft werden.");
}

export async function reserveWorkOrderAuftragNr(params: {
  type: string;
  geraetenummer?: string;
  filialeCode?: UserFilialeCode | string;
  /** @deprecated PKW / Legacy — S05.26.S00001 */
  depot?: string;
  legacy?: boolean;
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

export { isStructuredGeraetenummer, isUserFilialeCode };
