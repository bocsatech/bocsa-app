#!/usr/bin/env node
/** Újraírja a hirdetesek.csv-t a JSON-ból (URL nélkül). */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { rowsToCsv } from "./parse.mjs";

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
  return rest;
});

writeFileSync(csvPath, rowsToCsv(rows), "utf8");
writeFileSync(jsonPath, JSON.stringify({ ...data, hirdetesek: rows, darabszam: rows.length }, null, 2), "utf8");
console.log(`OK: ${rows.length} db → ${csvPath} (URL nélkül)`);
