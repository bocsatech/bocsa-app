#!/usr/bin/env node
/**
 * Frissíti az iOS VehicleCatalog.json-t Autosweb katalógusból.
 *
 * Preferencia sorrend:
 *   1) argumentum: path a lista.csv-hez vagy vehicle-catalog.json-hoz
 *   2) autosweb/data/vehicle-catalog.json
 *   3) ~/Desktop|Downloads/lista.csv → import
 *
 * Használat:
 *   node bymy-ios/scripts/sync-vehicle-catalog.mjs
 *   node bymy-ios/scripts/sync-vehicle-catalog.mjs ~/Desktop/lista.csv
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import {
  importVehicleCatalogFromCsv,
  parseCsvText,
  buildVehicleCatalog,
  resolveDefaultCsvPath,
} from "../../autosweb/lib/vehicle-catalog.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "Bymy", "VehicleCatalog.json");
const AUTOSWEB_JSON = join(ROOT, "..", "autosweb", "data", "vehicle-catalog.json");

function slim(catalog) {
  const modellek = catalog.modellek ?? {};
  const gyartmanyok = (catalog.gyartmanyok ?? Object.keys(modellek)).slice().sort((a, b) =>
    a.localeCompare(b, "hu")
  );
  return {
    source: catalog.source ?? "autosweb",
    imported_at: catalog.imported_at ?? new Date().toISOString(),
    count_brands: gyartmanyok.length,
    count_models: gyartmanyok.reduce((n, b) => n + (modellek[b]?.length ?? 0), 0),
    gyartmanyok,
    modellek: Object.fromEntries(gyartmanyok.map((b) => [b, modellek[b] ?? []])),
  };
}

function loadFromJson(path) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (!raw?.modellek || !Object.keys(raw.modellek).length) {
    throw new Error(`Üres vagy hibás katalógus: ${path}`);
  }
  return slim(raw);
}

function loadFromCsv(path) {
  const text = readFileSync(path, "utf8");
  const rows = parseCsvText(text);
  return slim(buildVehicleCatalog(rows, path));
}

function main() {
  const arg = process.argv[2] ? resolve(process.argv[2]) : null;
  let catalog;

  if (arg) {
    if (arg.endsWith(".json")) catalog = loadFromJson(arg);
    else catalog = loadFromCsv(arg);
  } else if (existsSync(AUTOSWEB_JSON)) {
    catalog = loadFromJson(AUTOSWEB_JSON);
  } else {
    const csv = resolveDefaultCsvPath();
    if (!csv) {
      console.error("Nincs Autosweb katalógus / lista.csv.");
      console.error("Használat: node bymy-ios/scripts/sync-vehicle-catalog.mjs ~/Desktop/lista.csv");
      process.exit(1);
    }
    catalog = slim(importVehicleCatalogFromCsv(csv));
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(catalog));
  console.log(`OK → ${OUT}`);
  console.log(`  Márkák: ${catalog.count_brands}, modellek: ${catalog.count_models}`);
  console.log(`  Forrás: ${catalog.source}`);
}

main();
