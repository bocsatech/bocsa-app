import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { importLagerRecords, parseLagerSpreadsheet } from "../lib/lager-import.mjs";

function readEnv(contents) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.match(/^([^#=]+)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1].trim(), match[2].trim()])
  );
}

const inputFile = process.argv[2];
if (!inputFile) {
  console.error("Verwendung: npm run import:lager -- pfad/zur/datei.xlsx");
  process.exit(1);
}

const env = readEnv(await readFile(path.join(process.cwd(), ".env.local"), "utf8"));
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase-Konfiguration fehlt in .env.local");
}

const db = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const filePath = path.resolve(inputFile);
const buffer = await readFile(filePath);
const { records, errors: parseErrors, sheetName } = parseLagerSpreadsheet(
  buffer,
  path.basename(filePath)
);

console.log(`Blatt: ${sheetName}, Zeilen: ${records.length}`);
if (parseErrors.length) {
  console.log("Parse-Hinweise:", parseErrors.slice(0, 10).join("\n"));
}

const result = await importLagerRecords(db, records);
console.log(`Neu: ${result.imported}, aktualisiert: ${result.updated}`);
if (result.errors.length) {
  console.log("Fehler:", result.errors.slice(0, 20).join("\n"));
}
