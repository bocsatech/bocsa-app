import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export const PKW_ARBEITSAUFTRAG_LIST_PATH = "/pkw/arbeitsauftrag";
export const PKW_ARBEITSAUFTRAG_DETAIL_PATH = "/pkw/arbeitsauftrag/detail";

type DetailHrefParams = {
  fahrzeugId: string;
  auftragId?: string | null;
  auftragNr?: string | null;
  status?: string | null;
  type?: string | null;
  edit?: boolean;
  print?: boolean;
  from?: string | null;
  new?: boolean;
};

export function buildPkwArbeitsauftragDetailHref(params: DetailHrefParams): string {
  const search = new URLSearchParams();
  search.set("fahrzeugId", params.fahrzeugId);
  if (params.auftragId) search.set("auftragId", params.auftragId);
  else if (params.auftragNr?.trim()) search.set("auftragNr", params.auftragNr.trim());
  if (params.status?.trim()) search.set("status", params.status.trim());
  if (params.type?.trim()) search.set("type", params.type.trim());
  if (params.new) search.set("new", "1");
  if (params.edit) search.set("edit", "1");
  if (params.print) search.set("print", "1");
  if (params.from?.trim()) search.set("from", params.from.trim());
  return `${PKW_ARBEITSAUFTRAG_DETAIL_PATH}?${search.toString()}`;
}

export function shouldShowPkwArbeitsauftragDetail(searchParams: URLSearchParams): boolean {
  const fahrzeugId = searchParams.get("fahrzeugId");
  if (!fahrzeugId) return false;

  const auftragId = searchParams.get("auftragId");
  const auftragNr = searchParams.get("auftragNr");
  const isNew = searchParams.get("new") === "1";
  const hasType = Boolean(
    searchParams.get("status")?.trim() || searchParams.get("type")?.trim()
  );

  return Boolean(auftragId || auftragNr?.trim() || isNew || hasType);
}

export function isPkwArbeitsauftragDetailPath(pathname: string): boolean {
  return pathname === PKW_ARBEITSAUFTRAG_DETAIL_PATH;
}

export function navigateToPkwArbeitsauftragList(router: AppRouterInstance): void {
  router.push(PKW_ARBEITSAUFTRAG_LIST_PATH, { scroll: true });
}
