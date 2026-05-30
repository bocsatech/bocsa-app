import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export const PKW_PLAETZE_MAX = 5;

/** Fehlende PKW-Tabellen (PGRST205) → verständliche Meldung auf Deutsch. */
export function pkwSupabaseErrorResponse(error) {
  if (!error) return null;
  const msg = String(error.message ?? error);
  if (
    error.code === "PGRST205" ||
    msg.includes("schema cache") ||
    msg.includes("Could not find the table")
  ) {
    return NextResponse.json(
      {
        error:
          "PKW-Tabellen fehlen in Supabase. SQL Editor: supabase/pkw-tables-only.sql ausführen, 30 Sekunden warten, Seite neu laden.",
      },
      { status: 503 }
    );
  }
  return NextResponse.json({ error: msg }, { status: 500 });
}

export const SLOT_HOURS = [8, 10, 12, 14];
export const SLOT_DURATION_MS = 2 * 60 * 60 * 1000;

export function normalizeKennzeichen(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

export async function hashPortalPin(pin) {
  const trimmed = String(pin ?? "").trim();
  if (!trimmed || trimmed.length < 4) {
    throw new Error("Portal-PIN mindestens 4 Zeichen.");
  }
  return bcrypt.hash(trimmed, 10);
}

export async function verifyPortalPin(pin, hash) {
  if (!hash) return false;
  return bcrypt.compare(String(pin ?? "").trim(), hash);
}

export function normalizeBuchungRow(row) {
  if (!row) return row;
  let servicearten = row.servicearten;
  if (typeof servicearten === "string") {
    try {
      servicearten = JSON.parse(servicearten);
    } catch {
      servicearten = [];
    }
  }
  if (!Array.isArray(servicearten)) servicearten = [];

  return {
    ...row,
    servicearten,
    km_stand: row.km_stand != null ? Number(row.km_stand) : null,
    platz_nummer: row.platz_nummer != null ? Number(row.platz_nummer) : null,
  };
}

/** Nächste freie Platznummer 1–5 für slot_start */
export async function findFreePlatz(db, slotStartIso) {
  const { data: booked, error } = await db
    .from("pkw_buchungen")
    .select("platz_nummer")
    .eq("slot_start", slotStartIso)
    .not("status", "eq", "abgesagt")
    .not("platz_nummer", "is", null);

  if (error) throw new Error(error.message);

  const used = new Set((booked ?? []).map((r) => Number(r.platz_nummer)));
  for (let n = 1; n <= PKW_PLAETZE_MAX; n += 1) {
    if (!used.has(n)) return n;
  }
  return null;
}

export function buildSlotsForDate(dateYmd) {
  const slots = [];
  for (const hour of SLOT_HOURS) {
    const start = new Date(`${dateYmd}T${String(hour).padStart(2, "0")}:00:00`);
    const end = new Date(start.getTime() + SLOT_DURATION_MS);
    slots.push({
      start: start.toISOString(),
      end: end.toISOString(),
      label: start.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" }),
    });
  }
  return slots;
}

export async function countBookingsForSlot(db, slotStartIso) {
  const { count, error } = await db
    .from("pkw_buchungen")
    .select("*", { count: "exact", head: true })
    .eq("slot_start", slotStartIso)
    .not("status", "eq", "abgesagt");

  if (error) throw new Error(error.message);
  return count ?? 0;
}
