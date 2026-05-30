/**
 * QR-Codes für alle Maschinen mit strukturierter Gerätenummer neu erzeugen.
 *
 *   node scripts/regenerate-machine-qr-codes.mjs
 *   node scripts/regenerate-machine-qr-codes.mjs --dry-run
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { isStructuredGeraetenummer } from "../lib/geraetenummer.ts";
import { persistMachineQrCode } from "../lib/machine-qr.mjs";

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
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://bocsa-app-bocsarobert-3405s-projects.vercel.app";

const dryRun = process.argv.includes("--dry-run");

if (!url || !key) {
  console.error("Fehlt: NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: machines, error } = await supabase
  .from("maschines")
  .select("*")
  .order("created_at", { ascending: true });

if (error) {
  console.error(error.message);
  process.exit(1);
}

let ok = 0;
let skipped = 0;
let failed = 0;

for (const machine of machines ?? []) {
  const label = machine.geraetenummer ?? machine.id;

  if (!isStructuredGeraetenummer(machine.geraetenummer)) {
    console.log(`⊘ ${label}: übersprungen (kein MARKE-KLASSE-ART-00001 Format)`);
    skipped += 1;
    continue;
  }

  if (dryRun) {
    console.log(`· ${label}: würde neu generieren`);
    ok += 1;
    continue;
  }

  try {
    const bustUrl = await persistMachineQrCode(supabase, machine, appUrl);
    console.log(`✓ ${label}: ${bustUrl}`);
    ok += 1;
  } catch (err) {
    console.log(`✗ ${label}: ${err.message}`);
    failed += 1;
  }
}

console.log(`\nFertig: ${ok} ok, ${skipped} übersprungen, ${failed} fehlgeschlagen`);
if (!dryRun && ok > 0) {
  console.log("Hinweis: Browser-Cache leeren (Cmd+Shift+R).");
}
