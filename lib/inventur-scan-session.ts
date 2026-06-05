export const INVENTUR_SCAN_STORAGE_KEY = "bocsa_inventur_scan";

export type InventurScanItem = {
  herstellernummer: string;
  scannedAt: string;
};

export type InventurScanSession = {
  createdAt: string;
  items: InventurScanItem[];
};

export function createEmptyInventurScanSession(): InventurScanSession {
  return { createdAt: new Date().toISOString(), items: [] };
}

export function readInventurScanSession(): InventurScanSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(INVENTUR_SCAN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InventurScanSession;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeInventurScanSession(session: InventurScanSession) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(INVENTUR_SCAN_STORAGE_KEY, JSON.stringify(session));
}

export function clearInventurScanSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(INVENTUR_SCAN_STORAGE_KEY);
}

export function normalizeInventurScanValue(raw: string) {
  const text = String(raw ?? "").trim();
  if (!text) return "";

  try {
    const url = new URL(text);
    const teilId = url.searchParams.get("teil");
    if (teilId) return teilId.trim();
  } catch {
    // plain text
  }

  return text.replace(/\s+/g, " ").trim();
}

export function appendInventurScanValue(raw: string): InventurScanSession {
  const value = normalizeInventurScanValue(raw);
  const session = readInventurScanSession() ?? createEmptyInventurScanSession();
  if (!value) return session;

  const exists = session.items.some(
    (item) => item.herstellernummer.toLowerCase() === value.toLowerCase()
  );
  if (!exists) {
    session.items.push({ herstellernummer: value, scannedAt: new Date().toISOString() });
  }
  writeInventurScanSession(session);
  return session;
}

export function inventurScanToCsv(session: InventurScanSession) {
  const lines = ["Herstellernummer;Gescannt_am"];
  for (const item of session.items) {
    lines.push(`${item.herstellernummer};${item.scannedAt}`);
  }
  return lines.join("\n");
}

export function downloadInventurScanFile(session: InventurScanSession) {
  const blob = new Blob([JSON.stringify(session, null, 2)], {
    type: "application/json",
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `inventur-scan-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
