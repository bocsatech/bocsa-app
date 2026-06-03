import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export const ARBEITSAUFTRAG_LIST_PATH = "/arbeitsauftrag";
export const ARBEITSAUFTRAG_DETAIL_PATH = "/arbeitsauftrag/detail";

type DetailHrefParams = {
  machineId: string;
  auftragId?: string | null;
  /** Fallback, wenn nur Auftrag-Nr. in Lagerbewegungen gespeichert ist */
  auftragNr?: string | null;
  status?: string | null;
  type?: string | null;
  edit?: boolean;
  print?: boolean;
  from?: string | null;
  new?: boolean;
};

export function buildArbeitsauftragDetailHref(params: DetailHrefParams): string {
  const search = new URLSearchParams();
  search.set("machineId", params.machineId);
  if (params.auftragId) search.set("auftragId", params.auftragId);
  else if (params.auftragNr?.trim()) search.set("auftragNr", params.auftragNr.trim());
  if (params.status?.trim()) search.set("status", params.status.trim());
  if (params.type?.trim()) search.set("type", params.type.trim());
  if (params.new) search.set("new", "1");
  if (params.edit) search.set("edit", "1");
  if (params.print) search.set("print", "1");
  if (params.from?.trim()) search.set("from", params.from.trim());
  return `${ARBEITSAUFTRAG_DETAIL_PATH}?${search.toString()}`;
}

/** Detail-Ansicht (Formular), nicht die Listenübersicht. */
export function shouldShowArbeitsauftragDetail(searchParams: URLSearchParams): boolean {
  const machineId = searchParams.get("machineId");
  if (!machineId) return false;

  const auftragId = searchParams.get("auftragId");
  const auftragNr = searchParams.get("auftragNr");
  const isNew = searchParams.get("new") === "1";
  const hasType = Boolean(
    searchParams.get("status")?.trim() || searchParams.get("type")?.trim()
  );

  return Boolean(auftragId || auftragNr?.trim() || isNew || hasType);
}

export function isArbeitsauftragDetailPath(pathname: string): boolean {
  return pathname === ARBEITSAUFTRAG_DETAIL_PATH;
}

export function navigateToArbeitsauftragList(router: AppRouterInstance): void {
  router.push(ARBEITSAUFTRAG_LIST_PATH, { scroll: true });
}
