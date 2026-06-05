import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runLagerInventurSchemaSetup } from "../lib/lager-inventur-setup-server.mjs";

function readEnv(contents) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.match(/^([^#=]+)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1].trim(), match[2].trim()])
  );
}

const envPath = resolve(process.cwd(), ".env.local");
try {
  const env = readEnv(readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(env)) {
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  /* optional */
}

const result = await runLagerInventurSchemaSetup();
if (result.ok) {
  console.log(`OK: supabase/${result.file}`);
  process.exit(0);
}

console.error(result.error);
if (result.sqlEditorUrl) {
  console.error(`SQL Editor: ${result.sqlEditorUrl}`);
}
console.error(`Manuell: supabase/${result.file ?? "lager-inventur-sessions.sql"}`);
process.exit(1);
