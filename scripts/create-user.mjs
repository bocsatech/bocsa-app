/**
 * Benutzer in Supabase-Tabelle "users" anlegen:
 * node scripts/create-user.mjs <Benutzername> <Passwort> <Geheimzahl 0-99>
 *
 * Beispiel: node scripts/create-user.mjs admin demo123 42
 */
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const USERS_TABLE = "users";

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

const [username, password] = process.argv.slice(2);

if (!username || !password) {
  console.error(
    "Verwendung: node scripts/create-user.mjs <Benutzername> <Passwort>"
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Supabase URL oder Key fehlt in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);
const password_hash = await bcrypt.hash(password, 10);

const { data, error } = await supabase
  .from(USERS_TABLE)
  .insert({
    username: username.trim().toLowerCase(),
    password_hash,
    secret_pin,
  })
  .select("id, username")
  .single();

if (error) {
  console.error("Fehler:", error.message);
  if (error.message.includes("schema cache")) {
    console.error(
      '\n→ Führen Sie zuerst supabase/users-setup.sql im Supabase SQL Editor aus.'
    );
  }
  process.exit(1);
}

console.log("Benutzer erstellt in Tabelle users:", data);
