/**
 * Demo-Daten für PKW-Modul (Kunden, Fahrzeuge, Buchungen).
 * Voraussetzung: supabase/pkw-setup.sql ausgeführt.
 *
 *   node scripts/seed-pkw-demo.mjs
 */
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
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
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Fehlt NEXT_PUBLIC_SUPABASE_URL / Key in .env.local");
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const pinHash = await bcrypt.hash("1234", 10);

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const day = tomorrow.toISOString().slice(0, 10);

async function upsertKunde(row) {
  const { data: existing } = await db
    .from("kunden")
    .select("id")
    .eq("kundennummer", row.kundennummer)
    .maybeSingle();

  if (existing) {
    const { data, error } = await db.from("kunden").update(row).eq("id", existing.id).select("id").single();
    if (error) throw new Error(error.message);
    return data.id;
  }

  const { data, error } = await db.from("kunden").insert(row).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}

async function upsertFahrzeug(row) {
  const { data: existing } = await db
    .from("pkw_fahrzeuge")
    .select("id")
    .eq("kennzeichen", row.kennzeichen)
    .maybeSingle();

  if (existing) {
    const { data, error } = await db
      .from("pkw_fahrzeuge")
      .update(row)
      .eq("id", existing.id)
      .select("id, qr_token")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await db.from("pkw_fahrzeuge").insert(row).select("id, qr_token").single();
  if (error) throw new Error(error.message);
  return data;
}

try {
  const k1 = await upsertKunde({
    kundennummer: "K-DEMO-001",
    anrede: "Herr",
    vorname: "Thomas",
    nachname: "Muster",
    email: "t.muster@example.com",
    telefon: "+43 1 2345678",
    strasse: "Hauptstraße 12",
    plz: "2320",
    ort: "Schwechat",
    land: "AT",
    portal_pin_hash: pinHash,
    aktiv: true,
  });

  const k2 = await upsertKunde({
    kundennummer: "K-DEMO-002",
    firma: "Bau GmbH",
    vorname: "Anna",
    nachname: "Kovács",
    email: "office@bau-gmbh.at",
    mobil: "+43 660 1234567",
    ort: "Wien",
    land: "AT",
    portal_pin_hash: pinHash,
    aktiv: true,
  });

  const fz1 = await upsertFahrzeug({
    kunde_id: k1,
    kennzeichen: "W 1234 AB",
    marke: "VW",
    modell: "Golf",
    baujahr: "2019",
    kraftstoff: "Diesel",
    km_stand: 87400,
    km_stand_at: new Date().toISOString(),
    aktiv: true,
  });

  const fz2 = await upsertFahrzeug({
    kunde_id: k2,
    kennzeichen: "W 5678 CD",
    marke: "Skoda",
    modell: "Octavia",
    baujahr: "2021",
    km_stand: 42100,
    km_stand_at: new Date().toISOString(),
    aktiv: true,
  });

  const slotStart = new Date(`${day}T10:00:00`);
  const slotEnd = new Date(slotStart.getTime() + 2 * 60 * 60 * 1000);

  const { error: bErr } = await db.from("pkw_buchungen").upsert(
    {
      kunde_id: k1,
      fahrzeug_id: fz1.id,
      kennzeichen: "W 1234 AB",
      km_stand: 87400,
      servicearten: ["oelwechsel", "inspektion"],
      problem_text: null,
      slot_start: slotStart.toISOString(),
      slot_end: slotEnd.toISOString(),
      platz_nummer: 1,
      status: "bestaetigt",
      source: "buero",
    },
    { onConflict: "id", ignoreDuplicates: false }
  );

  if (bErr && !bErr.message.includes("duplicate")) {
    await db.from("pkw_buchungen").insert({
      kunde_id: k1,
      fahrzeug_id: fz1.id,
      kennzeichen: "W 1234 AB",
      km_stand: 87400,
      servicearten: ["oelwechsel", "inspektion"],
      slot_start: slotStart.toISOString(),
      slot_end: slotEnd.toISOString(),
      platz_nummer: 1,
      status: "bestaetigt",
      source: "buero",
    });
  }

  console.log("PKW Demo-Daten OK");
  console.log("");
  console.log("Portal-Test:");
  console.log("  Kennzeichen: W 1234 AB");
  console.log("  PIN: 1234");
  console.log(`  URL: /pkw/buchen?token=${fz1.qr_token}`);
  console.log("");
  console.log("SQL falls Tabellen fehlen: supabase/pkw-setup.sql");
} catch (error) {
  console.error(error.message);
  console.error("\n→ Supabase SQL Editor:");
  console.error("   1. supabase/pkw-tables-only.sql  (Run)");
  console.error("   2. Warten 10–30 s");
  console.error("   3. npm run verify:pkw");
  console.error("   4. npm run seed:pkw");
  console.error("\n   Danach optional: supabase/pkw-setup.sql (Rechte für Kunden/Serviz-Menü)");
  process.exit(1);
}
