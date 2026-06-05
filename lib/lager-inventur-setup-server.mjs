import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

const SETUP_FILE = "lager-inventur-sessions.sql";

export function isInventurSessionsTableMissingError(message) {
  const text = String(message ?? "").toLowerCase();
  return (
    text.includes("lager_inventur_sessions") &&
    (text.includes("schema cache") ||
      text.includes("does not exist") ||
      text.includes("could not find") ||
      text.includes("relation") && text.includes("not exist"))
  );
}

export function getSupabaseProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? null;
}

export function getSupabaseSqlEditorUrl() {
  const ref = getSupabaseProjectRef();
  return ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : null;
}

export function hasInventurDbConnectionEnv() {
  return Boolean(
    process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL
  );
}

export async function runLagerInventurSchemaSetup() {
  const connectionString =
    process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
    return {
      ok: false,
      manual: true,
      error:
        "SUPABASE_DB_URL fehlt. Supabase → SQL Editor: supabase/lager-inventur-sessions.sql ausführen.",
      sqlEditorUrl: getSupabaseSqlEditorUrl(),
      file: SETUP_FILE,
    };
  }

  const sqlPath = resolve(process.cwd(), "supabase", SETUP_FILE);
  if (!existsSync(sqlPath)) {
    return {
      ok: false,
      manual: true,
      error: `SQL-Datei fehlt: supabase/${SETUP_FILE}`,
      sqlEditorUrl: getSupabaseSqlEditorUrl(),
      file: SETUP_FILE,
    };
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query(readFileSync(sqlPath, "utf8"));
    return { ok: true, file: SETUP_FILE };
  } catch (error) {
    return {
      ok: false,
      manual: true,
      error: error instanceof Error ? error.message : "Setup fehlgeschlagen.",
      sqlEditorUrl: getSupabaseSqlEditorUrl(),
      file: SETUP_FILE,
    };
  } finally {
    await client.end().catch(() => {});
  }
}
