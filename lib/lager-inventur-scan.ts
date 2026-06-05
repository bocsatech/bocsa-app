export const INVENTUR_NEU_PREFILL_KEY = "bocsaInventurNeuPrefill";

export type InventurScanExport = {
  version: 1;
  createdAt: string;
  order: string[];
  counts: Record<string, string>;
};

export function buildInventurScanExport(
  order: string[],
  counts: Record<string, string>
): InventurScanExport {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    order,
    counts,
  };
}

export function downloadInventurScanFile(order: string[], counts: Record<string, string>) {
  const payload = buildInventurScanExport(order, counts);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const link = document.createElement("a");
  link.href = url;
  link.download = `bocsa-inventur-${stamp}.json`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseInventurScanFile(
  text: string
): { order: string[]; counts: Record<string, string> } | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    if (record.counts && typeof record.counts === "object" && !Array.isArray(record.counts)) {
      const counts = record.counts as Record<string, string>;
      const order = Array.isArray(record.order)
        ? record.order
            .map((id) => String(id))
            .filter((id) => counts[id] !== undefined)
        : Object.keys(counts);
      return { order, counts };
    }

    const legacyCounts: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      if (key === "version" || key === "createdAt" || key === "order") continue;
      legacyCounts[key] = String(value);
    }
    if (Object.keys(legacyCounts).length === 0) return null;
    return { order: Object.keys(legacyCounts), counts: legacyCounts };
  } catch {
    return null;
  }
}
