import type { MaintenanceLagerLink } from "./types/maintenance";
import type { PkwFahrzeug } from "./types/pkw";

export function getPkwErsatzteile(fz: Pick<PkwFahrzeug, "ersatzteile">): MaintenanceLagerLink[] {
  const raw = fz.ersatzteile;
  if (!Array.isArray(raw)) return [];

  const out: MaintenanceLagerLink[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const lagerTeilId = String(record.lagerTeilId ?? "").trim();
    if (!lagerTeilId) continue;
    out.push({
      lagerTeilId,
      herstellernummer: String(record.herstellernummer ?? "").trim(),
      bezeichnung: record.bezeichnung != null ? String(record.bezeichnung) : null,
      lagerplatz: record.lagerplatz != null ? String(record.lagerplatz) : null,
    });
  }
  return out;
}

export function serializePkwErsatzteile(parts: MaintenanceLagerLink[]) {
  return parts
    .map((part) => ({
      lagerTeilId: part.lagerTeilId.trim(),
      herstellernummer: part.herstellernummer.trim(),
      bezeichnung: part.bezeichnung?.trim() || null,
      lagerplatz: part.lagerplatz?.trim() || null,
    }))
    .filter((part) => part.lagerTeilId);
}
