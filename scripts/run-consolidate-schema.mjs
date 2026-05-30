/**
 * Führt supabase/consolidate-schema.sql per Postgres-Verbindung aus.
 *
 * Einmal in .env.local eintragen (Supabase → Project Settings → Database → URI):
 *   SUPABASE_DB_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
 *
 *   npm run db:consolidate
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import pg from "pg";

const { Client } = pg;

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

const connectionString =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!connectionString) {
  console.error(
    "Fehlt SUPABASE_DB_URL in .env.local\n\n" +
      "Supabase Dashboard → Project Settings → Database → Connection string (URI)\n" +
      "Oder im SQL Editor manuell: supabase/consolidate-schema.sql ausführen."
  );
  process.exit(1);
}

const sqlPath = resolve(process.cwd(), "supabase/consolidate-schema.sql");
const sql = readFileSync(sqlPath, "utf8");

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Verbunden. Führe consolidate-schema.sql aus …");
  await client.query(sql);
  console.log("Fertig. Prüfen: npm run audit:supabase");
} catch (error) {
  console.error("Fehler:", error.message);
  process.exit(1);
} finally {
  await client.end();
}
