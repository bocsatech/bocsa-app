export type InventurEntwurfPayload = {
  order: string[];
  counts: Record<string, string>;
};

export type InventurEntwurfSummary = {
  teilId: string;
  entwurf: number;
  entwurfAt: string;
  entwurfBy: string | null;
};

export async function uploadInventurEntwurf(payload: InventurEntwurfPayload) {
  const response = await fetch("/api/lager/inventur/entwurf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      data: null,
      error: new Error(result.error ?? "Scan konnte nicht übertragen werden."),
      setupRequired: Boolean(result.setupRequired),
    };
  }
  return {
    data: result as { teilCount: number },
    error: null,
    setupRequired: false,
  };
}

export async function fetchInventurEntwuerfe() {
  const response = await fetch("/api/lager/inventur/entwurf", {
    credentials: "include",
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      data: [] as InventurEntwurfSummary[],
      error: new Error(result.error ?? "Entwürfe laden fehlgeschlagen."),
      setupRequired: Boolean(result.setupRequired),
      setupHint: typeof result.setupHint === "string" ? result.setupHint : undefined,
    };
  }
  return {
    data: (result.entwuerfe ?? []) as InventurEntwurfSummary[],
    error: null,
    setupRequired: Boolean(result.setupRequired),
    setupHint: typeof result.setupHint === "string" ? result.setupHint : undefined,
  };
}

export function buildEntwurfPrefill(entwuerfe: InventurEntwurfSummary[]) {
  const sorted = [...entwuerfe].sort(
    (a, b) => new Date(b.entwurfAt).getTime() - new Date(a.entwurfAt).getTime()
  );
  const order = sorted.map((row) => row.teilId);
  const counts: Record<string, string> = {};
  for (const row of sorted) {
    counts[row.teilId] = String(row.entwurf);
  }
  return { order, counts };
}
