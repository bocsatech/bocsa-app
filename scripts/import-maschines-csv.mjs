import { readFile } from "node:fs/promises";
import path from "node:path";

const TABLE = "maschines";
const DEFAULT_INPUT_FILE = path.join(process.cwd(), "exports", "maschines.csv");
const inputFile = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_INPUT_FILE;
const CSV_DELIMITER = ";";
const DATE_COLUMNS = new Set([
  "tpg_heben_technik_7_8_gultig_bis",
  "elektro_ove_e8701_e8001_gultig_bis",
  "intern_8_11_gultig_bis",
  "paragraf_57a_gultig_bis",
  "std_zahler_getauscht_am",
  "letztes_service_am",
  "frostschutz_gepruft_am",
]);

function readEnv(contents) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.match(/^([^#=]+)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1].trim(), match[2].trim()])
  );
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === CSV_DELIMITER) {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function normalizeDate(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }

  const hungarian = trimmed.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2}|\d{4})$/);
  if (hungarian) {
    const year =
      hungarian[3].length === 2 ? `20${hungarian[3]}` : hungarian[3];
    return `${year}-${hungarian[2].padStart(2, "0")}-${hungarian[1].padStart(2, "0")}`;
  }

  const excelSerial = Number(trimmed.replace(",", "."));
  if (Number.isInteger(excelSerial) && excelSerial > 20000 && excelSerial < 80000) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + excelSerial * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
  }

  return trimmed;
}

function normalizeValue(value, column) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (DATE_COLUMNS.has(column)) return normalizeDate(trimmed);
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

async function supabaseRequest(url, key, endpoint, options) {
  const response = await fetch(`${url}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: "return=minimal",
      ...options.headers,
    },
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${options.method} ${endpoint} fehlgeschlagen (${response.status}): ${body}`);
  }
}

const env = readEnv(await readFile(path.join(process.cwd(), ".env.local"), "utf8"));
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL oder NEXT_PUBLIC_SUPABASE_ANON_KEY fehlt.");
}

const rawCsv = (await readFile(inputFile, "utf8")).replace(/^\uFEFF/, "");
const csvRows = parseCsv(rawCsv).filter((row) =>
  row.some((cell) => cell.trim())
);
const [columns, ...dataRows] = csvRows;

if (!columns?.length) {
  throw new Error("CSV hat keine Kopfzeile.");
}

let updated = 0;
let inserted = 0;

for (const row of dataRows) {
  const record = Object.fromEntries(
    columns.map((column, index) => [column, normalizeValue(row[index] ?? "", column)])
  );
  const id = typeof record.id === "string" ? record.id.trim() : "";

  if (id) {
    const patch = { ...record };
    delete patch.id;
    delete patch.created_at;
    await supabaseRequest(supabaseUrl, supabaseKey, `${TABLE}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    updated += 1;
  } else {
    const insert = { ...record };
    delete insert.id;
    delete insert.created_at;
    await supabaseRequest(supabaseUrl, supabaseKey, TABLE, {
      method: "POST",
      body: JSON.stringify(insert),
    });
    inserted += 1;
  }
}

console.log(`Import abgeschlossen: ${inputFile}`);
console.log(`Aktualisiert: ${updated}`);
console.log(`Neu eingefuegt: ${inserted}`);
