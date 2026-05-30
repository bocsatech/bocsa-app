/**
 * Supabase-Audit: App-Tabellen, Duplikat-Check machines/maschines, Legacy-Warnungen.
 *
 *   npm run audit:supabase
 *   node scripts/audit-supabase-full.mjs --json exports/supabase-audit.json
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Fehlt: NEXT_PUBLIC_SUPABASE_URL und Key in .env.local");
  process.exit(1);
}

const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "?";

/** Von bocsa-app genutzte Tabellen (GitHub-Code = diese Namen) */
const APP_TABLES = [
  { name: "maschines", detailColumns: ["id", "geraetenummer", "bezeichnung", "status", "stundenzahlerstand", "prufung", "intern_8_11_gultig_bis", "depot", "baujahr"] },
  { name: "lager_teile", detailColumns: ["id", "herstellernummer", "bezeichnung", "lagerstand", "lagerort"] },
  { name: "lager_bewegungen", detailColumns: ["id", "lager_teil_id", "menge", "typ", "created_at"] },
  { name: "users", detailColumns: ["id", "username", "full_name", "position", "site"] },
  { name: "permissions", detailColumns: ["key", "label", "category"] },
  { name: "permission_groups", detailColumns: ["id", "name"] },
  { name: "group_permissions", detailColumns: ["group_id", "permission_key"] },
  { name: "app_settings", detailColumns: ["key", "updated_at"] },
  { name: "arbeitsstunden_eintraege", detailColumns: ["id", "user_id", "datum"] },
  { name: "arbeitsauftrag_nr_counters", detailColumns: ["prefix", "last_value", "updated_at"] },
];

/** Soll nach consolidate-schema.sql nicht mehr erreichbar sein */
const FORBIDDEN_DUPLICATE = "machines";

/** Alte Sheets-Tabellen — sollen fehlen oder 0 Zeilen */
const LEGACY_TABLES = [
  "Arbeitsprotokol",
  "Dokumentation",
  "Ersatzteile",
  "Erzatsteile",
  "Prufprotokol",
  "Prufungen info",
  "QR code",
  "service_orders",
];

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function probeTable(name) {
  const { data, error: selectError } = await supabase.from(name).select("*").limit(1);

  if (selectError) {
    const missing = /could not find the table/i.test(selectError.message);
    return {
      name,
      ok: false,
      error: selectError.message,
      rows: null,
      missing,
    };
  }

  const { count, error: countError } = await supabase
    .from(name)
    .select("*", { count: "exact", head: true });

  if (countError) {
    return { name, ok: false, error: countError.message, rows: null };
  }

  return { name, ok: true, rows: count ?? (data?.length ?? 0) };
}

async function fetchDetail(name, columns) {
  const { data, error } = await supabase.from(name).select(columns.join(",")).limit(500);
  if (error) return { error: error.message, rows: [] };
  return { rows: data ?? [] };
}

function duplicateGeraetenummern(rows) {
  const map = new Map();
  for (const row of rows) {
    const num = row.geraetenummer?.trim();
    if (!num) continue;
    if (!map.has(num)) map.set(num, []);
    map.get(num).push(row.id);
  }
  return [...map.entries()].filter(([, ids]) => ids.length > 1);
}

async function main() {
  const jsonOut = process.argv.includes("--json")
    ? process.argv[process.argv.indexOf("--json") + 1]
    : null;

  console.log("═".repeat(60));
  console.log("Supabase-Audit (bocsa-app)");
  console.log("Project ref:", projectRef);
  console.log("URL:", url);
  console.log("Key:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "service_role" : "anon");
  console.log("═".repeat(60));
  console.log("");

  const report = {
    generatedAt: new Date().toISOString(),
    projectRef,
    url,
    keyType: process.env.SUPABASE_SERVICE_ROLE_KEY ? "service_role" : "anon",
    appTables: [],
    duplicateTable: null,
    legacyTables: [],
    issues: [],
  };

  const dupProbe = await probeTable(FORBIDDEN_DUPLICATE);
  report.duplicateTable = dupProbe;

  if (dupProbe.missing || (!dupProbe.ok && dupProbe.error)) {
    console.log(`✓ ${FORBIDDEN_DUPLICATE.padEnd(26)} nicht vorhanden (OK)`);
  } else if (dupProbe.ok) {
    const msg =
      `FEHLER: Tabelle/View „${FORBIDDEN_DUPLICATE}“ existiert noch (${dupProbe.rows} Zeilen). ` +
      "Im Supabase SQL Editor: supabase/consolidate-schema.sql ausführen.";
    report.issues.push(msg);
    console.log(`✗ ${FORBIDDEN_DUPLICATE.padEnd(26)} ${dupProbe.rows} Zeilen — MUSS entfernt werden`);
    console.log(`    → supabase/consolidate-schema.sql`);
  } else {
    console.log(`✓ ${FORBIDDEN_DUPLICATE.padEnd(26)} nicht vorhanden (OK)`);
  }

  console.log("");
  console.log("App-Tabellen:");

  for (const table of APP_TABLES) {
    const probe = await probeTable(table.name);
    const entry = { ...probe, samples: [] };

    if (probe.ok && table.detailColumns && probe.rows > 0) {
      const detail = await fetchDetail(table.name, table.detailColumns);
      if (detail.error) {
        entry.detailError = detail.error;
      } else {
        entry.samples = detail.rows;
      }
    } else if (!probe.ok && !probe.missing) {
      report.issues.push(`${table.name}: ${probe.error}`);
    }

    report.appTables.push(entry);

    const status = probe.ok ? `✓ ${probe.rows} Zeilen` : `✗ ${probe.error}`;
    console.log(`  ${table.name.padEnd(26)} ${status}`);

    if (table.name === "maschines" && entry.samples?.length) {
      const dups = duplicateGeraetenummern(entry.samples);
      for (const [num, ids] of dups) {
        const msg = `Doppelte geraetenummer „${num}“ (${ids.length}×)`;
        report.issues.push(msg);
        console.log(`    ⚠ ${msg}`);
      }
      console.log("    Gerätenummern:");
      for (const row of entry.samples) {
        console.log(
          `      ${row.geraetenummer ?? "—"} | ${row.bezeichnung ?? "(ohne Bezeichnung)"}`
        );
      }
    }
  }

  console.log("");
  console.log("Legacy-Tabellen (sollen fehlen):");

  for (const name of LEGACY_TABLES) {
    const probe = await probeTable(name);
    report.legacyTables.push(probe);
    if (probe.missing || (!probe.ok && probe.error)) {
      console.log(`  ✓ ${name.padEnd(24)} nicht vorhanden`);
    } else if (probe.ok && probe.rows > 0) {
      const msg = `Legacy-Tabelle „${name}“ hat noch ${probe.rows} Zeilen — consolidate-schema.sql`;
      report.issues.push(msg);
      console.log(`  ✗ ${name.padEnd(24)} ${probe.rows} Zeilen`);
    } else if (probe.ok) {
      console.log(`  ~ ${name.padEnd(24)} leer (optional löschen)`);
    } else {
      console.log(`  ✓ ${name.padEnd(24)} nicht vorhanden`);
    }
  }

  console.log("");
  if (report.issues.length) {
    console.log(`${report.issues.length} Problem(e). Behebung: supabase/consolidate-schema.sql`);
  } else {
    console.log("Schema OK — DB entspricht dem GitHub-Code.");
  }

  if (jsonOut) {
    const dir = resolve(jsonOut, "..");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(jsonOut, JSON.stringify(report, null, 2), "utf8");
    console.log("");
    console.log("JSON:", jsonOut);
  }

  if (report.issues.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
