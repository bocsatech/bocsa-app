import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import pg from "pg";

const { Client } = pg;

const SETUP_FILES = ["pkw-setup.sql", "pkw-permissions-only.sql"];

export function getSupabaseProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? null;
}

export function getSupabaseSqlEditorUrl() {
  const ref = getSupabaseProjectRef();
  return ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : null;
}

export function hasPkwDbConnectionEnv() {
  return Boolean(
    process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL
  );
}

export async function runPkwSchemaSetup() {
  const connectionString =
    process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
    return {
      ok: false,
      manual: true,
      error:
        "SUPABASE_DB_URL fehlt. Supabase → Project Settings → Database → Connection string in Vercel/.env.local, oder SQL manuell ausführen.",
      sqlEditorUrl: getSupabaseSqlEditorUrl(),
      files: SETUP_FILES,
    };
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    for (const file of SETUP_FILES) {
      const sqlPath = resolve(process.cwd(), "supabase", file);
      if (!existsSync(sqlPath)) {
        throw new Error(`SQL-Datei fehlt: ${file}`);
      }
      await client.query(readFileSync(sqlPath, "utf8"));
    }
    return { ok: true, files: SETUP_FILES };
  } catch (error) {
    return {
      ok: false,
      manual: true,
      error: error.message,
      sqlEditorUrl: getSupabaseSqlEditorUrl(),
      files: SETUP_FILES,
    };
  } finally {
    await client.end().catch(() => {});
  }
}
