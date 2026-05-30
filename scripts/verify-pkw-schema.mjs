/**
 * Prüft, ob PKW-Tabellen in der Supabase-API sichtbar sind.
 *   npm run verify:pkw
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    if (!process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1);
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Fehlt .env.local");
  process.exit(1);
}

const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
console.log("Projekt:", ref);

const res = await fetch(`${url}/rest/v1/kunden?select=id&limit=1`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
});

if (res.ok) {
  console.log("✓ Tabelle kunden erreichbar — npm run seed:pkw");
  process.exit(0);
}

const body = await res.text();
console.error("✗ kunden nicht in der API:", res.status, body.slice(0, 200));
console.error("");
console.error("→ Supabase SQL Editor: supabase/pkw-tables-only.sql ausführen");
console.error("→ 10–30 Sekunden warten, dann erneut: npm run verify:pkw");
process.exit(1);
