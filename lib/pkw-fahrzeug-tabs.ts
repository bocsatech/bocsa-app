export const PKW_FAHRZEUG_LOCALHOST_SECTIONS = [
  "Ersatzteile",
  "Motor",
  "Technische Daten",
  "Dokumentation",
  "Rechnungen",
] as const;

export type PkwFahrzeugLocalhostSection = (typeof PKW_FAHRZEUG_LOCALHOST_SECTIONS)[number];

export const PKW_FAHRZEUG_DETAIL_TAB_PARAM = "tab";

export function buildPkwFahrzeugTabHref(pathname: string, tab: string) {
  const detailMatch = pathname.match(/^\/pkw\/fahrzeuge\/([^/]+)$/);
  const base = detailMatch ? pathname : "/pkw/fahrzeuge";
  const params = new URLSearchParams();
  params.set(PKW_FAHRZEUG_DETAIL_TAB_PARAM, tab);
  return `${base}?${params.toString()}`;
}

export function readPkwFahrzeugTabParam(
  searchParams: URLSearchParams
): string | null {
  return searchParams.get(PKW_FAHRZEUG_DETAIL_TAB_PARAM);
}

export function isPkwFahrzeugLocalhostSection(
  tab: string | null | undefined
): tab is PkwFahrzeugLocalhostSection {
  return (
    tab != null &&
    (PKW_FAHRZEUG_LOCALHOST_SECTIONS as readonly string[]).includes(tab)
  );
}

export function readPkwTabDataSection<T extends Record<string, unknown>>(
  tabData: Record<string, unknown> | null | undefined,
  key: string,
  initial: T
): T {
  const raw = tabData?.[key];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...initial };
  }
  return { ...initial, ...(raw as Partial<T>) };
}
