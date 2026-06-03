export const MASCHINEN_LIST_PATH = "/maschinen";

export function maschinenListHref(params?: {
  geraettyp?: string;
  geraetenummer?: string;
  aktion?: string;
}): string {
  const search = new URLSearchParams();
  if (params?.geraettyp?.trim()) search.set("geraettyp", params.geraettyp.trim());
  if (params?.geraetenummer?.trim()) search.set("geraetenummer", params.geraetenummer.trim());
  if (params?.aktion?.trim()) search.set("aktion", params.aktion.trim());
  const query = search.toString();
  return query ? `${MASCHINEN_LIST_PATH}?${query}` : MASCHINEN_LIST_PATH;
}
