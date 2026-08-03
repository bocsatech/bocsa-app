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

export const PRICE_STEP = 500_000;
export const PRICE_MAX_CAP = 50_000_000;
export const PRICE_STEPS: number[] = Array.from(
  { length: Math.floor(PRICE_MAX_CAP / PRICE_STEP) + 1 },
  (_, i) => i * PRICE_STEP,
);

export const YEAR_MIN = 1990;
export const YEAR_MAX = new Date().getFullYear();
export const YEAR_STEPS: number[] = Array.from(
  { length: YEAR_MAX - YEAR_MIN + 1 },
  (_, i) => YEAR_MIN + i,
);

export const KM_STEP = 10_000;
export const KM_MAX_CAP = 500_000;
export const KM_STEPS: number[] = Array.from(
  { length: Math.floor(KM_MAX_CAP / KM_STEP) + 1 },
  (_, i) => i * KM_STEP,
);

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
