/**
 * Kopiert alle Zeilen von Tabelle/View „machines“ nach „maschines“ (Upsert per id).
 * Anschließend im Supabase SQL Editor: supabase/consolidate-schema.sql
 *
 *   node scripts/sync-machines-to-maschines.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Fehlt: NEXT_PUBLIC_SUPABASE_URL und Key in .env.local");
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: fromMachines, error: loadError } = await db.from("machines").select("*");

if (loadError) {
  if (loadError.message.includes("schema cache")) {
    console.log("OK: „machines“ existiert nicht mehr. Nur „maschines“ wird genutzt.");
    process.exit(0);
  }
  console.error(loadError.message);
  process.exit(1);
}

if (!fromMachines?.length) {
  console.log("„machines“ ist leer. Führen Sie consolidate-schema.sql aus, um die Doppelung zu entfernen.");
  process.exit(0);
}

let upserted = 0;
let failed = 0;

for (const row of fromMachines) {
  const { id, created_at: _c, ...rest } = row;
  const { error } = await db.from("maschines").upsert({ id, ...rest }, { onConflict: "id" });
  if (error) {
    console.error(`  ✗ ${row.geraetenummer ?? id}: ${error.message}`);
    failed += 1;
  } else {
    upserted += 1;
  }
}

console.log(`Synchronisiert: ${upserted} Zeile(n) machines → maschines`);
if (failed) process.exit(1);

console.log("");
console.log("Nächster Schritt (Supabase → SQL Editor):");
console.log("  supabase/consolidate-schema.sql");
console.log("Danach: npm run audit:supabase");
