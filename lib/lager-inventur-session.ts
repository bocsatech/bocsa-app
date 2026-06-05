export type InventurSessionPayload = {
  order: string[];
  counts: Record<string, string>;
};

export type InventurSessionSummary = {
  id: string;
  createdAt: string;
  expiresAt: string;
  createdByUsername: string;
  filialeCode: string | null;
  teilCount: number;
  payload: InventurSessionPayload;
};

export async function createInventurSession(payload: InventurSessionPayload) {
  const response = await fetch("/api/lager/inventur/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { data: null, error: new Error(result.error ?? "Scan konnte nicht übertragen werden.") };
  }
  return { data: result as { id: string }, error: null };
}

export type InventurSessionsFetchResult = {
  sessions: InventurSessionSummary[];
  setupRequired?: boolean;
  setupHint?: string;
  sqlEditorUrl?: string | null;
};

export async function fetchPendingInventurSessions() {
  const response = await fetch("/api/lager/inventur/sessions", {
    credentials: "include",
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      data: [] as InventurSessionSummary[],
      error: new Error(result.error ?? "Sessions laden fehlgeschlagen."),
      setupRequired: Boolean(result.setupRequired),
    };
  }
  return {
    data: (result.sessions ?? []) as InventurSessionSummary[],
    error: null,
    setupRequired: Boolean(result.setupRequired),
    setupHint: typeof result.setupHint === "string" ? result.setupHint : undefined,
    sqlEditorUrl: typeof result.sqlEditorUrl === "string" ? result.sqlEditorUrl : null,
  };
}

export async function applyInventurSession(sessionId: string) {
  const response = await fetch(`/api/lager/inventur/sessions/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify({ action: "apply" }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { error: new Error(result.error ?? "Session konnte nicht übernommen werden.") };
  }
  return { error: null };
}

export function formatInventurSessionAge(createdAt: string) {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return "";
  const minutes = Math.max(0, Math.round((Date.now() - created.getTime()) / 60000));
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  return `vor ${hours} Std.`;
}
