/** Server — Ersatzteile-JSON für pkw_fahrzeuge */

export function serializePkwErsatzteile(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const lagerTeilId = String(entry.lagerTeilId ?? "").trim();
    if (!lagerTeilId) continue;
    out.push({
      lagerTeilId,
      herstellernummer: String(entry.herstellernummer ?? "").trim(),
      bezeichnung: entry.bezeichnung != null ? String(entry.bezeichnung).trim() || null : null,
      lagerplatz: entry.lagerplatz != null ? String(entry.lagerplatz).trim() || null : null,
    });
  }
  return out;
}
