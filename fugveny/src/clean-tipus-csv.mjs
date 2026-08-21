#!/usr/bin/env node
/**
 * Meglévő lista CSV Tipus mezőinek tisztítása (marketing / alcím zaj).
 *
 * Usage:
 *   npm run clean:tipus -- ~/Desktop/uj-lista.csv ~/Desktop/uj-lista-tisztitott.csv
 *   node src/clean-tipus-csv.mjs in.csv out.csv [--field Tipus]
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { cleanTipusText } from "./clean-tipus.mjs";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (inQ && text[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQ = !inQ;
      }
    } else if ((ch === "," || ch === "\n" || ch === "\r") && !inQ) {
      if (ch === "\r") continue;
      row.push(cur);
      cur = "";
      if (ch === "\n") {
        if (row.length > 1 || row[0] !== "" || rows.length === 0) rows.push(row);
        row = [];
      }
    } else {
      cur += ch;
    }
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function escapeCsvCell(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function findTipusIndex(headers, preferred) {
  if (preferred) {
    const i = headers.findIndex((h) => h === preferred);
    if (i >= 0) return i;
  }
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const name of ["tipus", "típus", "type"]) {
    const i = lower.indexOf(name);
    if (i >= 0) return i;
  }
  return -1;
}

function main() {
  const args = process.argv.slice(2);
  let field = null;
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--field" && args[i + 1]) {
      field = args[++i];
    } else if (!args[i].startsWith("-")) {
      positional.push(args[i]);
    }
  }

  const [inPath, outPath] = positional;
  if (!inPath || !outPath) {
    console.error(
      "Használat: npm run clean:tipus -- <bemenet.csv> <kimenet.csv> [--field Tipus]"
    );
    process.exitCode = 1;
    return;
  }
  if (!existsSync(inPath)) {
    console.error(`Nincs fájl: ${inPath}`);
    process.exitCode = 1;
    return;
  }

  const raw = readFileSync(inPath, "utf8");
  const table = parseCsv(raw);
  if (table.length < 2) {
    console.error("Üres vagy érvénytelen CSV.");
    process.exitCode = 1;
    return;
  }

  const headers = table[0];
  const col = findTipusIndex(headers, field);
  if (col < 0) {
    console.error(
      `Nincs Tipus oszlop. Fejlécek: ${headers.join(", ")}\n` +
        `Add meg: --field <oszlopnév>`
    );
    process.exitCode = 1;
    return;
  }

  let changed = 0;
  const out = [headers.map(escapeCsvCell).join(",")];
  for (let r = 1; r < table.length; r += 1) {
    const row = table[r].slice();
    while (row.length < headers.length) row.push("");
    const before = row[col] ?? "";
    const after = cleanTipusText(before);
    if (after !== collapseCompare(before)) {
      changed += 1;
      row[col] = after;
    } else {
      row[col] = after;
    }
    out.push(row.slice(0, headers.length).map(escapeCsvCell).join(","));
  }

  writeFileSync(outPath, `${out.join("\n")}\n`, "utf8");
  console.log(
    `OK: ${table.length - 1} sor, ${changed} Tipus tisztítva → ${outPath}`
  );
}

function collapseCompare(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

main();
