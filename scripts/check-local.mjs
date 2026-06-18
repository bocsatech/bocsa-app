#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const required = [
  "package.json",
  "next.config.mjs",
  "proxy.ts",
  "app/layout.js",
  "app/page.tsx",
  "app/login/page.tsx",
];

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

  console.log(`${urlOk ? "✓" : "✗"} NEXT_PUBLIC_SUPABASE_URL`);
  console.log(`${anonOk ? "✓" : "✗"} NEXT_PUBLIC_SUPABASE_ANON_KEY`);
  console.log(`${sessionOk ? "✓" : "✗"} SESSION_SECRET (vagy Service-Role / Anon Key)`);

  if (!urlOk || !anonOk || !sessionOk) ok = false;
}

console.log("");
if (!ok) {
  if (!env) {
    console.log("→ cp .env.local.example .env.local");
  }
  console.log("→ Supabase → Settings → API → URL + anon key másolása");
  console.log("→ SESSION_SECRET=barmilyen-hosszu-random-szoveg");
  console.log("");
  console.log("Utána: npm run dev  →  http://localhost:3000/login");
  process.exit(1);
}

if (hasBrokenCache) {
  console.log("Javítás: npm run fix:local");
  process.exit(1);
}

console.log("Minden rendben.");
console.log("Indítás: npm run dev");
console.log("Login: admin / demo123  (Geheimzahl 42)");
