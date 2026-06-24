/**
 * Egy gép QR-Code neu erzeugen (Gerätenummer in der Mitte).
 *
 *   node scripts/regenerate-machine-qr-one.mjs KB-GG-BG15-00002
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
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

const geraetenummerArg = process.argv[2]?.trim();
if (!geraetenummerArg) {
  console.error("Usage: node scripts/regenerate-machine-qr-one.mjs <Gerätenummer>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
  .ilike("geraetenummer", geraetenummerArg);

if (error) {
  console.error(error.message);
  process.exit(1);
}

const machine = (machines ?? []).find(
  (row) => String(row.geraetenummer ?? "").trim().toUpperCase() === geraetenummerArg.toUpperCase()
);

if (!machine) {
  console.error(`Keine Maschine mit Gerätenummer „${geraetenummerArg}" gefunden.`);
  process.exit(1);
}

try {
  const bustUrl = await persistMachineQrCode(supabase, machine, appUrl);
  console.log(`✓ ${machine.geraetenummer}: ${bustUrl}`);
  console.log("Hard refresh (Ctrl+Shift+R) a Stammdaten oldalon.");
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}
