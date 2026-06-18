/**
 * Supabase-Sync prüfen (lokal oder vor Live-Test):
 *   node scripts/verify-supabase-sync.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
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
  console.error("Fehlt: NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function columnExists(column) {
  const { data, error } = await supabase.from("maschines").select(column).limit(1);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

async function main() {
  console.log("Supabase:", url);
  console.log("");

  const checks = [
    ["maschines.kep", () => columnExists("kep")],
    ["maschines.qr_code", () => columnExists("qr_code")],
    ["maschines.arbeitsstunden", () => columnExists("arbeitsstunden")],
    ["lager_bewegungen", async () => {
      const { error } = await supabase.from("lager_bewegungen").select("id").limit(1);
      return error ? { ok: false, error: error.message } : { ok: true };
    }],
  ];

  let failed = 0;
  for (const [name, fn] of checks) {
    const result = await fn();
    if (result.ok) {
      console.log(`✓ ${name}`);
    } else {
      console.log(`✗ ${name}: ${result.error}`);
      failed += 1;
    }
  }

  const { data: machines, error: listError } = await supabase
    .from("maschines")
    .select("id, geraetenummer, machine_tab_data, arbeitsstunden")
    .limit(200);

  if (listError) {
    console.error("\nMaschinen laden fehlgeschlagen:", listError.message);
    process.exit(1);
  }

  let orderCount = 0;
  let withProtocol = 0;
  let missingId = 0;
  let missingAuftragNr = 0;

  for (const machine of machines ?? []) {
    const orders = machine.machine_tab_data?.work_orders;
    if (!Array.isArray(orders)) continue;
    for (const order of orders) {
      orderCount += 1;
      if (!order?.id || typeof order.id !== "string" || !String(order.id).trim()) {
        missingId += 1;
      }
      if (
        order &&
        typeof order === "object" &&
        (!order.auftragNr || !String(order.auftragNr).trim())
      ) {
        missingAuftragNr += 1;
      }
      if (order?.protocol && typeof order.protocol === "object") {
        withProtocol += 1;
      }
    }
  }

  const { error: arbeitsprotokolError } = await supabase
    .from("arbeitsprotokol")
    .select("id")
    .limit(1);

  console.log("");
  console.log(`Arbeitsaufträge in maschines.machine_tab_data: ${orderCount}`);
  console.log(`davon mit gespeichertem protocol: ${withProtocol}`);
  console.log(`ohne order.id (Legacy — wird beim Laden ergänzt): ${missingId}`);
  console.log(`ohne gespeicherte auftragNr (Anzeige aus wo_-ID): ${missingAuftragNr}`);
  if (arbeitsprotokolError) {
    console.log("Legacy-Tabelle public.arbeitsprotokol: nicht vorhanden (OK)");
  } else {
    console.log(
      "⚠ Legacy-Tabelle public.arbeitsprotokol existiert noch — Daten ggf. in work_orders[] prüfen"
    );
  }
  console.log("");

  if (failed > 0) {
    console.log("→ Im Supabase SQL Editor ausführen: supabase/schema-patches.sql");
    process.exit(1);
  }

  console.log("Schema OK. Live-Test:");
  console.log("  1. App öffnen, Arbeitsauftrag bearbeiten, Speichern");
  console.log("  2. Seite neu laden — Protokoll muss gleich bleiben");
  console.log("  3. Optional: node scripts/verify-supabase-sync.mjs erneut (withProtocol steigt)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
