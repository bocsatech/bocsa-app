export const ARBEITSAUFTRAG_LIST_PATH = "/arbeitsauftrag";

/** Detail-Ansicht (Formular), nicht die Listenübersicht. */
export function shouldShowArbeitsauftragDetail(searchParams: URLSearchParams): boolean {
  const machineId = searchParams.get("machineId");
  if (!machineId) return false;

  const auftragId = searchParams.get("auftragId");
  const isNew = searchParams.get("new") === "1";
  const hasType = Boolean(
    searchParams.get("status")?.trim() || searchParams.get("type")?.trim()
  );

  return Boolean(auftragId || isNew || hasType);
}
