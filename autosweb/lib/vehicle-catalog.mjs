import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const CATALOG_PATH = join(DATA_DIR, "vehicle-catalog.json");

const DEFAULT_CSV_CANDIDATES = [
  join(homedir(), "Desktop", "lista.csv"),
  join(homedir(), "Downloads", "lista.csv"),
  join(homedir(), "Downloads", "fugveny", "uj lista", "uj-lista.csv"),
  join(homedir(), "Downloads", "fugveny", "hirdetesek.csv"),
];

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeBrand(value) {
  const text = normalizeText(value);
  if (!text) return "";
  const upper = text.toUpperCase();
  if (upper === "VW") return "VOLKSWAGEN";
  if (upper === "MERCEDES") return "MERCEDES-BENZ";
  if (upper === "ŠKODA" || upper === "SKODA") return "SKODA";
  return upper;
}

function normalizeHeader(header) {
  const key = normalizeText(header).toLowerCase();
  if (key.includes("gyárt") || key.includes("gyart") || key === "márka" || key === "marka") {
    return "gyartmany";
  }
  if (key === "modell") return "modell";
  if (key.includes("típus") || key.includes("tipus")) return "tipus";
  return key;
}

function splitCsvLine(line, delimiter) {
  const out = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

export function parseCsvText(text) {
  const cleaned = String(text ?? "").replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];

  const delimiter =
    lines[0].includes(";") && lines[0].split(";").length >= lines[0].split(",").length
      ? ";"
      : ",";
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = normalizeText(values[index] ?? "");
    });
    return row;
  });
}

export function buildVehicleCatalog(rows, source = "lista.csv") {
  const modellek = new Map();
  const tipusok = new Map();

  for (const row of rows) {
    const brand = normalizeBrand(row.gyartmany);
    const model = normalizeText(row.modell);
    const tipus = normalizeText(row.tipus);
    if (!brand) continue;

    if (!modellek.has(brand)) modellek.set(brand, new Set());
    if (model) modellek.get(brand).add(model);

    if (brand && model && tipus) {
      const key = `${brand}|${model}`;
      if (!tipusok.has(key)) tipusok.set(key, new Set());
      tipusok.get(key).add(tipus);
    }
  }

  const gyartmanyok = [...modellek.keys()].sort((a, b) => a.localeCompare(b, "hu"));
  const modellekObj = Object.fromEntries(
    [...modellek.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "hu"))
      .map(([brand, models]) => [brand, [...models].sort((a, b) => a.localeCompare(b, "hu"))])
  );
  const tipusokObj = Object.fromEntries(
    [...tipusok.entries()].map(([key, values]) => [
      key,
      [...values].sort((a, b) => a.localeCompare(b, "hu")),
    ])
  );

  return {
    source,
    imported_at: new Date().toISOString(),
    count_rows: rows.length,
    gyartmanyok,
    modellek: modellekObj,
    tipusok: tipusokObj,
  };
}

export function loadVehicleCatalog(path = CATALOG_PATH) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function saveVehicleCatalog(catalog, path = CATALOG_PATH) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return path;
}

export function importVehicleCatalogFromCsv(csvPath, outPath = CATALOG_PATH) {
  const resolved = csvPath;
  if (!existsSync(resolved)) {
    throw new Error(`CSV nem található: ${resolved}`);
  }
  const text = readFileSync(resolved, "utf8");
  const rows = parseCsvText(text);
  if (!rows.length) {
    throw new Error("Üres vagy hibás CSV.");
  }
  const catalog = buildVehicleCatalog(rows, resolved);
  if (!catalog.gyartmanyok.length) {
    throw new Error("Nincs gyártmány a CSV-ben — ellenőrizd a fejlécet (Gyartmany, Modell).");
  }
  saveVehicleCatalog(catalog, outPath);
  return catalog;
}

export function resolveDefaultCsvPath(explicitPath = null) {
  if (explicitPath) return explicitPath;
  for (const candidate of DEFAULT_CSV_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function catalogHasModels(catalog) {
  return Object.values(catalog?.modellek ?? {}).some((models) => models?.length > 0);
}

export function ensureVehicleCatalog() {
  const existing = loadVehicleCatalog();
  if (existing?.gyartmanyok?.length && catalogHasModels(existing)) return existing;

  const csvPath = resolveDefaultCsvPath();
  if (!csvPath) return existing;

  try {
    return importVehicleCatalogFromCsv(csvPath);
  } catch (error) {
    console.warn("Járműkatalógus import sikertelen:", error.message);
    return existing;
  }
}

export function getVehicleCatalogPath() {
  return CATALOG_PATH;
}

export { CATALOG_PATH, DEFAULT_CSV_CANDIDATES };
