import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT = path.join(process.cwd(), "exports", "maschines-demo-fill.csv");
const depots = ["Schwehat", "578", "101", "Graz", "Wien"];
const types = ["stampfer", "Kipplader 3.2 m3 Swivel", "Bagger"];
const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

const rows = [];
let sequence = 1;

for (const depot of depots) {
  for (const type of types) {
    for (const size of ["klein", "gross"]) {
      for (let index = 1; index <= 50; index += 1) {
        const no = String(sequence).padStart(6, "0");
        const idx = String(index).padStart(2, "0");
        rows.push({
          geraetenummer: `DEMO-${no}`,
          bezeichnung: `${type} ${size} ${idx}`,
          serial_nummer: `SN-DEMO-${no}`,
          depot,
          baujahr: String(years[(sequence - 1) % years.length]),
          status: size,
          subgroup: type,
          machine_tab_data: "{}",
        });
        sequence += 1;
      }
    }
  }
}

const header = [
  "geraetenummer",
  "bezeichnung",
  "serial_nummer",
  "depot",
  "baujahr",
  "status",
  "subgroup",
  "machine_tab_data",
];

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[;"\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

const csv = [
  header.join(";"),
  ...rows.map((row) => header.map((column) => escapeCsv(row[column])).join(";")),
].join("\n");

await writeFile(OUTPUT, `\uFEFF${csv}\n`, "utf8");
console.log(`CSV erstellt: ${OUTPUT}`);
console.log(`Zeilen: ${rows.length}`);
