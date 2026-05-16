#!/usr/bin/env node
/**
 * Lager (lager_teile) törlése parancssorból.
 *
 *   node scripts/clear-lager.mjs --all
 *   node scripts/clear-lager.mjs --prefix catalog
 *   node scripts/clear-lager.mjs --pattern '^SP'
 */
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const BOELS_PREFIX_RE = /^(SP|SA|SO|SL|SK|SN|SAO|SOE)\s*[- ]?[0-9]/i;

async function loadEnv() {
  try {
    const raw = await readFile(".env.local", "utf8");
    return Object.fromEntries(
      raw
        .split(/\n/)
        .map((line) => line.match(/^([^#=]+)=(.*)$/))
        .filter(Boolean)
        .map((match) => [match[1].trim(), match[2].trim()])
    );
  } catch {
    return {};
  }
}

function parseArgs(argv) {
  const opts = { all: false, prefix: null, pattern: null };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--all") opts.all = true;
    else if (arg === "--prefix" && argv[i + 1]) {
      opts.prefix = argv[++i];
    } else if (arg === "--pattern" && argv[i + 1]) {
      opts.pattern = new RegExp(argv[++i], "i");
    }
  }
  return opts;
}

function shouldDelete(herstellernummer, opts) {
  const value = String(herstellernummer ?? "").trim();
  if (!value) return false;
  if (opts.all) return true;
  if (opts.prefix === "catalog" || opts.prefix === "boels") return CATALOG_PREFIX_RE.test(value);
  if (opts.pattern) return opts.pattern.test(value);
  return false;
}

const opts = parseArgs(process.argv);
if (!opts.all && !opts.prefix && !opts.pattern) {
  console.error("Usage: node scripts/clear-lager.mjs --all | --prefix catalog | --pattern '^SP'");
  process.exit(1);
}

const env = await loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL und Key fehlen (.env.local).");
  process.exit(1);
}

const db = createClient(url, key);
const { data: rows, error } = await db.from("lager_teile").select("id, herstellernummer");

if (error) {
  console.error(error.message);
  process.exit(1);
}

const targets = (rows ?? []).filter((row) => shouldDelete(row.herstellernummer, opts));
if (!targets.length) {
  console.log("Keine passenden Teile (gesamt in DB:", rows?.length ?? 0, ").");
  process.exit(0);
}

const ids = targets.map((row) => row.id);
const { error: deleteError } = await db.from("lager_teile").delete().in("id", ids);

if (deleteError) {
  console.error(deleteError.message);
  process.exit(1);
}

console.log(
  `Gelöscht: ${ids.length} von ${rows?.length ?? 0}`,
  targets.slice(0, 5).map((row) => row.herstellernummer).join(", "),
  targets.length > 5 ? "…" : ""
);
