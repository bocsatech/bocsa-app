import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const TABLE = "maschines";
const OUTPUT_FILE = path.join(process.cwd(), "exports", "maschines.csv");
const CSV_DELIMITER = ";";

const PREFERRED_COLUMNS = [
  "id",
  "created_at",
  "status",
  "prufung",
  "geraetenummer",
  "bezeichnung",
  "serial_nummer",
  "depot",
  "baujahr",
  "kep",
  "qr_code",
  "subgroup",
  "stundenzahlerstand",
  "tpg_heben_technik_7_8_gultig_bis",
  "elektro_ove_e8701_e8001_gultig_bis",
  "intern_8_11_gultig_bis",
  "paragraf_57a_gultig_bis",
  "kennzeichen",
  "std_zahler_getauscht_am",
  "stundenzahlerstand_alt",
  "letztes_service_am",
  "letztes_service_von",
  "frostschutz_gepruft_am",
  "schadensmeldung_status",
  "beschreibung",
  "engine_type",
  "engine_number",
  "engine_power_kw",
  "emission_standard",
  "net_weight",
  "total_width",
  "total_height",
  "total_length",
  "engine_oil_type",
  "engine_oil_capacity",
  "hydraulic_oil_type",
  "hydraulic_oil_capacity",
  "machine_tab_data",
];

function readEnv() {
  return Object.fromEntries(
    (awaitableReadEnv.contents ?? "")
      .split(/\r?\n/)
      .map((line) => line.match(/^([^#=]+)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1].trim(), match[2].trim()])
  );
}

const awaitableReadEnv = {
  contents: await readFile(path.join(process.cwd(), ".env.local"), "utf8"),
};

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  if (new RegExp(`[\\"${CSV_DELIMITER}\\r\\n]`).test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

async function fetchAllRows(url, key) {
  const rows = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const to = from + pageSize - 1;
    const response = await fetch(
      `${url}/rest/v1/${TABLE}?select=*&order=created_at.asc`,
      {
        headers: {
          apikey: key,
          authorization: `Bearer ${key}`,
          range: `${from}-${to}`,
        },
      }
    );

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`Export fehlgeschlagen (${response.status}): ${body}`);
    }

    const page = JSON.parse(body);
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

const env = readEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL oder NEXT_PUBLIC_SUPABASE_ANON_KEY fehlt.");
}

const rows = await fetchAllRows(supabaseUrl, supabaseKey);
const discoveredColumns = new Set(rows.flatMap((row) => Object.keys(row)));
const columns = [
  ...PREFERRED_COLUMNS.filter((column) => discoveredColumns.has(column)),
  ...[...discoveredColumns]
    .filter((column) => !PREFERRED_COLUMNS.includes(column))
    .sort(),
];

const csv = [
  columns.map(csvEscape).join(CSV_DELIMITER),
  ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(CSV_DELIMITER)),
].join("\n");

await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
await writeFile(OUTPUT_FILE, `\uFEFF${csv}\n`, "utf8");

console.log(`Exportiert: ${OUTPUT_FILE}`);
console.log(`Zeilen: ${rows.length}`);
console.log(`Spalten: ${columns.length}`);
