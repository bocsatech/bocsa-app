#!/usr/bin/env node
/** Újraírja a hirdetesek.csv-t a JSON-ból (URL/kód nélkül, Audi modell javítva). */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { CSV_HEADERS, fixAudiModellTipus, rowsToCsv } from "./parse.mjs";

const dir = process.argv[2] || join(homedir(), "Downloads", "fugveny");
const jsonPath = join(dir, "hirdetesek.json");
const csvPath = join(dir, "hirdetesek.csv");

if (!existsSync(jsonPath)) {
  console.error(`Nincs JSON: ${jsonPath}`);
  process.exitCode = 1;
  process.exit();
}

const data = JSON.parse(readFileSync(jsonPath, "utf8"));
const rows = (data.hirdetesek || data).map((row) => {
  const { Url, url, Hirdeteskod, hirdeteskod, ...rest } = row;
  const fixed = fixAudiModellTipus(rest);
  const slim = {};
  for (const key of CSV_HEADERS) {
    slim[key] = fixed[key] ?? null;
  }
  return slim;
});

writeFileSync(csvPath, rowsToCsv(rows), "utf8");
writeFileSync(
  jsonPath,
  JSON.stringify({ ...data, hirdetesek: rows, darabszam: rows.length, mezok: CSV_HEADERS }, null, 2),
  "utf8"
);
console.log(`OK: ${rows.length} db → ${csvPath}`);
console.log("Mezők:", CSV_HEADERS.join(", "));
