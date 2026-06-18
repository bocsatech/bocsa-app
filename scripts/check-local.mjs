#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = resolve(import.meta.dirname, "..");
const required = [
  "package.json",
  "next.config.mjs",
  "proxy.ts",
  "app/layout.js",
  "app/page.tsx",
  "app/login/page.tsx",
];

const EXPECTED_URL = "https://duvzbcxsfzeqjnvohifm.supabase.co";

const manifest = resolve(
  root,
  ".next/dev/server/app/login/page/build-manifest.json"
);
const hasBrokenCache = existsSync(resolve(root, ".next")) && !existsSync(manifest);

function readEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) return null;
  const values = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    values[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return values;
}

function hasValue(env, key) {
  const value = env?.[key];
  return typeof value === "string" && value.length > 0;
}

async function verifySupabase(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return { ok: false, message: "Supabase URL vagy kulcs hiányzik" };
  }

  if (url !== EXPECTED_URL) {
    return {
      ok: false,
      message: `Rossz Supabase URL: ${url} (helyes: ${EXPECTED_URL})`,
    };
  }

  const db = createClient(url, key);
  const { data, error } = await db
    .from("users")
    .select("username, secret_pin")
    .eq("username", "admin")
    .maybeSingle();

  if (error) {
    return { ok: false, message: `Supabase hiba: ${error.message}` };
  }
  if (!data) {
    return {
      ok: false,
      message:
        'admin felhasználó nem található — ellenőrizd az anon key-t (Supabase → Settings → API)',
    };
  }

  return {
    ok: true,
    message: `admin OK (Geheimzahl: ${data.secret_pin ?? "?"})`,
  };
}

let ok = true;

console.log("BOCSA lokális ellenőrzés\n");
console.log(`Mappa: ${root}\n`);

for (const rel of required) {
  const path = resolve(root, rel);
  const exists = existsSync(path);
  console.log(`${exists ? "✓" : "✗"} ${rel}`);
  if (!exists) ok = false;
}

if (hasBrokenCache) {
  console.log("✗ .next cache sérült (404/500)");
} else if (existsSync(resolve(root, ".next"))) {
  console.log("✓ .next cache");
} else {
  console.log("○ .next cache (első indításkor jön létre)");
}

const env = readEnvLocal();
if (!env) {
  console.log("✗ .env.local hiányzik");
  ok = false;
} else {
  const urlOk = hasValue(env, "NEXT_PUBLIC_SUPABASE_URL");
  const anonOk = hasValue(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const sessionOk =
    hasValue(env, "SESSION_SECRET") ||
    hasValue(env, "SUPABASE_SERVICE_ROLE_KEY") ||
    anonOk;

  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  console.log(`${url === EXPECTED_URL ? "✓" : "✗"} NEXT_PUBLIC_SUPABASE_URL`);
  if (url && url !== EXPECTED_URL) {
    console.log(`  → helyes: ${EXPECTED_URL}`);
    ok = false;
  } else if (!urlOk) ok = false;

  console.log(`${anonOk ? "✓" : "✗"} NEXT_PUBLIC_SUPABASE_ANON_KEY`);
  if (!anonOk) ok = false;

  console.log(`${sessionOk ? "✓" : "✗"} SESSION_SECRET (vagy Service-Role / Anon Key)`);
  if (!sessionOk) ok = false;

  if (urlOk && anonOk) {
    const supabase = await verifySupabase(env);
    console.log(`${supabase.ok ? "✓" : "✗"} Supabase kapcsolat: ${supabase.message}`);
    if (!supabase.ok) ok = false;
  }
}

console.log("");
if (!ok) {
  console.log("Javítás:");
  console.log("  open -e .env.local");
  console.log("  # URL + anon key ellenőrzése, majd:");
  console.log("  npm run fix:local");
  process.exit(1);
}

if (hasBrokenCache) {
  console.log("Javítás: npm run fix:local");
  process.exit(1);
}

console.log("Minden rendben.");
console.log("Indítás: npm run dev");
console.log("Teszt:   npm run test:local");
