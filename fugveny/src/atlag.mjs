#!/usr/bin/env node
/**
 * Átlag számolás a mentett hirdetesek.csv / .json alapján.
 * Usage: node src/atlag.mjs [path/to/hirdetesek.csv|json]
 */
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join, extname } from "path";
import { digitsOnly } from "./parse.mjs";

function defaultPath() {
  const csv = join(homedir(), "Downloads", "fugveny", "hirdetesek.csv");
  const json = join(homedir(), "Downloads", "fugveny", "hirdetesek.json");
  if (existsSync(csv)) return csv;
  if (existsSync(json)) return json;
  return csv;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cols = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        cols.push(cur);
        cur = "";
      } else cur += ch;
    }
    cols.push(cur);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    return row;
  });
}

function loadRows(path) {
  const raw = readFileSync(path, "utf8");
  if (extname(path).toLowerCase() === ".json") {
    const data = JSON.parse(raw);
    return data.hirdetesek || data;
  }
  return parseCsv(raw);
}

function avg(nums) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function fmtInt(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return Math.round(n).toLocaleString("hu-HU");
}

function main() {
  const path = process.argv[2] || defaultPath();
  if (!existsSync(path)) {
    console.error(`Nincs adatfájl: ${path}`);
    console.error("Előbb futtasd: npm start");
    process.exitCode = 1;
    return;
  }

  const rows = loadRows(path);
  const prices = rows.map((r) => Number(digitsOnly(r.Vetelar))).filter((n) => n > 0);
  const kms = rows.map((r) => Number(digitsOnly(r.Kmora_allas))).filter((n) => n > 0);
  const years = rows
    .map((r) => {
      const m = String(r.Gyartasi_ev || "").match(/((?:19|20)\d{2})/);
      return m ? Number(m[1]) : null;
    })
    .filter((n) => n);

  const byMake = new Map();
  for (const row of rows) {
    const make = row.Gyartmany || "?";
    if (!byMake.has(make)) byMake.set(make, []);
    const p = Number(digitsOnly(row.Vetelar));
    if (p > 0) byMake.get(make).push(p);
  }

  console.log("Átlag számolás");
  console.log("==============");
  console.log(`Fájl: ${path}`);
  console.log(`Darabszám: ${rows.length}`);
  console.log(`Átlag vételár: ${fmtInt(avg(prices))} Ft  (${prices.length} db árral)`);
  console.log(`Átlag km:      ${fmtInt(avg(kms))} km`);
  console.log(`Átlag évjárat: ${avg(years) ? avg(years).toFixed(1) : "—"}`);
  console.log("");
  console.log("Átlag ár gyártmányonként:");
  [...byMake.entries()]
    .filter(([, arr]) => arr.length)
    .sort((a, b) => avg(b[1]) - avg(a[1]))
    .forEach(([make, arr]) => {
      console.log(`  ${make}: ${fmtInt(avg(arr))} Ft  (n=${arr.length})`);
    });
}

main();
