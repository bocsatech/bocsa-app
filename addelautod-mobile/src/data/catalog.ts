import type { ExtraKey, FuelType } from "../types";

/** Demo katalógus — később Autosweb / mentesmarka CSV */
export const BRANDS: Record<string, string[]> = {
  Audi: ["A3", "A4", "A6", "Q3", "Q5"],
  BMW: ["1-es", "3-as", "5-ös", "X1", "X3", "X5"],
  Ford: ["Fiesta", "Focus", "Kuga", "Mustang", "Puma"],
  Mercedes: ["A-osztály", "C-osztály", "E-osztály", "GLA", "GLC"],
  Opel: ["Astra", "Corsa", "Insignia", "Mokka"],
  Skoda: ["Fabia", "Octavia", "Superb", "Kodiaq"],
  Suzuki: ["Swift", "Vitara", "SX4 S-Cross"],
  Toyota: ["Corolla", "Yaris", "RAV4", "C-HR"],
  Volkswagen: ["Golf", "Passat", "Tiguan", "Polo", "ID.3"],
};

export const FUEL_OPTIONS: { key: NonNullable<FuelType>; label: string }[] = [
  { key: "benzin", label: "Benzin" },
  { key: "diesel", label: "Diesel" },
  { key: "hybrid", label: "Hybrid" },
  { key: "elektromos", label: "Elektromos" },
  { key: "benzin-gaz", label: "Benzin/Gáz" },
];

export const PRICE_PRESETS: { label: string; arTol: number | null; arIg: number | null }[] = [
  { label: "Mindegy", arTol: null, arIg: null },
  { label: "– 2 M Ft", arTol: null, arIg: 2_000_000 },
  { label: "2 – 5 M Ft", arTol: 2_000_000, arIg: 5_000_000 },
  { label: "5 – 10 M Ft", arTol: 5_000_000, arIg: 10_000_000 },
  { label: "10 M Ft –", arTol: 10_000_000, arIg: null },
];

export const YEAR_PRESETS: { label: string; evTol: number | null; evIg: number | null }[] = [
  { label: "Mindegy", evTol: null, evIg: null },
  { label: "2020 –", evTol: 2020, evIg: null },
  { label: "2015 – 2019", evTol: 2015, evIg: 2019 },
  { label: "2010 – 2014", evTol: 2010, evIg: 2014 },
  { label: "– 2009", evTol: null, evIg: 2009 },
];

export const KM_PRESETS: { label: string; kmTol: number | null; kmIg: number | null }[] = [
  { label: "Mindegy", kmTol: null, kmIg: null },
  { label: "– 50 000 km", kmTol: null, kmIg: 50_000 },
  { label: "– 100 000 km", kmTol: null, kmIg: 100_000 },
  { label: "– 150 000 km", kmTol: null, kmIg: 150_000 },
  { label: "150 000 km –", kmTol: 150_000, kmIg: null },
];

export const EXTRA_OPTIONS: { key: ExtraKey; label: string }[] = [
  { key: "klima", label: "Klíma" },
  { key: "automata", label: "Automata váltó" },
  { key: "tempomat", label: "Tempomat" },
  { key: "osszker", label: "Összkerék" },
  { key: "alufelni", label: "Alufelni" },
  { key: "elektromos_ablak", label: "Elektromos ablak" },
  { key: "vonohorog", label: "Vonóhorog" },
  { key: "isofix", label: "ISOFIX" },
  { key: "esp", label: "ESP" },
  { key: "szervizkonyv", label: "Szervizkönyv" },
];

export const SAVED_ICONS = ["🚗", "🔍", "⭐", "💎", "🏎️", "🛠️", "📌", "🔥"];
