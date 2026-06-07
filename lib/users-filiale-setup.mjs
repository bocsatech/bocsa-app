import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;
const SETUP_FILE = "users-filiale-patch.sql";

let setupAttempted = false;
let setupSucceeded = false;

export async function ensureUsersFilialeColumn() {
  if (setupSucceeded) return true;
  if (setupAttempted) return false;
  setupAttempted = true;

  const connectionString =
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;

  if (!connectionString) return false;

  const sqlPath = resolve(process.cwd(), "supabase", SETUP_FILE);
  if (!existsSync(sqlPath)) return false;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query(readFileSync(sqlPath, "utf8"));
    setupSucceeded = true;
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}
