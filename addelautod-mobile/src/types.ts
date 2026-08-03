export type FuelType = "benzin" | "diesel" | "hybrid" | "elektromos" | "benzin-gaz" | null;

export type ExtraKey =
  | "automata"
  | "tempomat"
  | "osszker"
  | "alufelni"
  | "elektromos_ablak"
  | "vonohorog"
  | "isofix"
  | "esp"
  | "szervizkonyv"
  | "klima";

export type SearchFilter = {
  gyartmanyok: string[];
  modell: string | null;
  fuel: FuelType;
  arTol: number | null;
  arIg: number | null;
  evTol: number | null;
  evIg: number | null;
  kmTol: number | null;
  kmIg: number | null;
  extras: Partial<Record<ExtraKey, boolean>>;
};

export type SavedSearch = {
  id: string;
  name: string;
  icon: string;
  filter: SearchFilter;
  createdAt: string;
};

export type FeedItem = {
  id: string;
  kind: "news" | "youtube";
  title: string;
  source: string;
  subtitle: string;
  url?: string;
};

export type FeaturedAd = {
  id: string;
  title: string;
  priceLabel: string;
  meta: string;
  badge?: string;
};

export function emptyFilter(): SearchFilter {
  return {
    gyartmanyok: [],
    modell: null,
    fuel: null,
    arTol: null,
    arIg: null,
    evTol: null,
    evIg: null,
    kmTol: null,
    kmIg: null,
    extras: {},
  };
}

export function countActiveExtras(filter: SearchFilter): number {
  return Object.values(filter.extras).filter(Boolean).length;
}

export function brandLabel(filter: SearchFilter): string {
  const list = filter.gyartmanyok;
  if (!list.length) return "Mindegy";
  if (list.length === 1) return list[0];
  if (list.length <= 3) return list.join(", ");
  return `${list.length} márka`;
}

export function summarizeFilter(filter: SearchFilter): string {
  const parts: string[] = [];
  if (filter.gyartmanyok.length) parts.push(brandLabel(filter));
  if (filter.modell) parts.push(filter.modell);
  if (filter.fuel) parts.push(fuelLabel(filter.fuel));
  if (filter.arIg != null) parts.push(`– ${formatPrice(filter.arIg)}`);
  if (filter.arTol != null && filter.arIg == null) parts.push(`${formatPrice(filter.arTol)} –`);
  const n = countActiveExtras(filter);
  if (n) parts.push(`${n} extra`);
  return parts.length ? parts.join(" · ") : "Nincs szűrő";
}

export function formatPrice(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)} M Ft`;
  }
  return `${Math.round(n / 1000)} ezer Ft`;
}

export function fuelLabel(fuel: NonNullable<FuelType>): string {
  switch (fuel) {
    case "benzin":
      return "Benzin";
    case "diesel":
      return "Diesel";
    case "hybrid":
      return "Hybrid";
    case "elektromos":
      return "Elektromos";
    case "benzin-gaz":
      return "Benzin/Gáz";
  }
}
