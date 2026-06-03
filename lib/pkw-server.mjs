import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { serializePkwErsatzteile } from "./pkw-ersatzteile.mjs";

export const PKW_PLAETZE_MAX = 5;

/** Fehlende PKW-Tabellen/Spalten → verständliche Meldung auf Deutsch. */
export function pkwSupabaseErrorResponse(error) {
  if (!error) return null;
  const msg = String(error.message ?? error);
  if (
    error.code === "PGRST204" ||
    (msg.includes("Could not find the") && msg.includes("column"))
  ) {
    const isGruppe = msg.includes("gruppe");
    return NextResponse.json(
      {
        error: isGruppe
          ? "Spalte pkw_fahrzeuge.gruppe fehlt. SQL Editor: supabase/pkw-gruppen-patch.sql ausführen, 30 Sekunden warten, Seite neu laden."
          : "PKW-Datenbank unvollständig (Spalte fehlt). SQL Editor: supabase/pkw-fahrzeuge-patch.sql ausführen, 30 Sekunden warten, Seite neu laden.",
      },
      { status: 503 }
    );
  }
  if (
    error.code === "PGRST205" ||
    msg.includes("schema cache") ||
    msg.includes("Could not find the table")
  ) {
    const isGruppen = msg.includes("pkw_gruppe_vorlagen");
    return NextResponse.json(
      {
        error: isGruppen
          ? "PKW-Gruppen-Tabelle fehlt. SQL Editor: supabase/pkw-gruppen-patch.sql ausführen (oder pkw-fahrzeuge-patch.sql), 30 Sekunden warten, Seite neu laden."
          : "PKW-Tabellen fehlen in Supabase. SQL Editor: supabase/pkw-tables-only.sql ausführen, danach pkw-fahrzeuge-patch.sql, 30 Sekunden warten, Seite neu laden.",
      },
      { status: 503 }
    );
  }
  return NextResponse.json({ error: msg }, { status: 500 });
}

/** Werkstatt-Tagesfenster (Europe/Vienna): Termine 07:00–17:00 */
export const PKW_DAY_START_HOUR = 7;
export const PKW_DAY_END_HOUR = 17;
export const SLOT_DURATION_MS = 60 * 60 * 1000;
export const PKW_TIMEZONE = "Europe/Vienna";

/** Lokaler Tagesanfang/-ende als ISO (Browser/Node lokale Zeitzone). */
export function localDayStartIso(dateYmd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return null;
  return new Date(`${dateYmd}T00:00:00`).toISOString();
}

export function localDayEndIso(dateYmd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return null;
  return new Date(`${dateYmd}T23:59:59.999`).toISOString();
}

/** Buchungen, die mit [fromIso, toIso] überlappen. */
export function buchungRangeFilter(query, fromIso, toIso) {
  if (fromIso) query = query.gte("slot_end", fromIso);
  if (toIso) query = query.lte("slot_start", toIso);
  return query;
}

export function normalizeKennzeichen(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

/** Termin ↔ Fahrzeug: fahrzeug_id oder Kennzeichen-Match (für Lager-Bedarf). */
export async function resolveBuchungFahrzeugLink(
  db,
  { fahrzeug_id, kennzeichen, kunde_id } = {}
) {
  const explicitId = String(fahrzeug_id ?? "").trim();
  let kundeId = kunde_id || null;

  if (explicitId) {
    const { data } = await db
      .from("pkw_fahrzeuge")
      .select("id, kunde_id")
      .eq("id", explicitId)
      .eq("aktiv", true)
      .maybeSingle();
    if (data) {
      return { fahrzeug_id: data.id, kunde_id: data.kunde_id ?? kundeId };
    }
  }

  const kz = normalizeKennzeichen(kennzeichen);
  if (!kz) {
    return { fahrzeug_id: null, kunde_id: kundeId };
  }

  const { data: rows, error } = await db
    .from("pkw_fahrzeuge")
    .select("id, kunde_id, kennzeichen")
    .eq("aktiv", true);

  if (error) throw new Error(error.message);

  const found = (rows ?? []).find((row) => normalizeKennzeichen(row.kennzeichen) === kz);
  if (!found) {
    return { fahrzeug_id: null, kunde_id: kundeId };
  }

  return {
    fahrzeug_id: found.id,
    kunde_id: found.kunde_id ?? kundeId,
  };
}

/** Ersatzteilbedarf am Fahrzeug speichern (z. B. aus PKW-Service-Termin). */
export async function applyBuchungErsatzteile(db, fahrzeugId, ersatzteileRaw) {
  const id = String(fahrzeugId ?? "").trim();
  if (!id || !Array.isArray(ersatzteileRaw)) return;

  const { error } = await db
    .from("pkw_fahrzeuge")
    .update({
      ersatzteile: serializePkwErsatzteile(ersatzteileRaw),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function hashPortalPin(pin) {
  const trimmed = validatePortalPin(pin);
  return bcrypt.hash(trimmed, 10);
}

export function validatePortalPin(pin) {
  const trimmed = String(pin ?? "").trim();
  if (!trimmed || trimmed.length < 4) {
    throw new Error("Portal-PIN mindestens 4 Zeichen.");
  }
  return trimmed;
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

  let munkafolyamat = row.munkafolyamat;
  if (typeof munkafolyamat === "string") {
    try {
      munkafolyamat = JSON.parse(munkafolyamat);
    } catch {
      munkafolyamat = [];
    }
  }
  if (!Array.isArray(munkafolyamat)) munkafolyamat = [];

  return {
    ...row,
    servicearten,
    munkafolyamat,
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
  for (let hour = PKW_DAY_START_HOUR; hour < PKW_DAY_END_HOUR; hour += 1) {
    const startIso = viennaLocalToIso(dateYmd, hour);
    const start = new Date(startIso);
    const end = new Date(start.getTime() + SLOT_DURATION_MS);
    const endParts = getViennaDateTimeParts(end);
    const endLabel = `${String(endParts.hour).padStart(2, "0")}:${String(endParts.minute).padStart(2, "0")}`;
    const startLabel = start.toLocaleTimeString("de-AT", {
      timeZone: PKW_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
    });
    slots.push({
      start: start.toISOString(),
      end: end.toISOString(),
      label: `${startLabel} – ${endLabel}`,
    });
  }
  return slots;
}

/** Prüft, ob slot_start/slot_end im Tagesfenster 07:00–17:00 (Wien) liegen. */
export function assertSlotWithinServiceHours(slotStartIso, slotEndIso) {
  const start = getViennaDateTimeParts(new Date(slotStartIso));
  const end = getViennaDateTimeParts(new Date(slotEndIso));
  if (start.hour < PKW_DAY_START_HOUR || end.hour > PKW_DAY_END_HOUR) {
    throw new Error(`Termin nur zwischen ${PKW_DAY_START_HOUR}:00 und ${PKW_DAY_END_HOUR}:00 Uhr möglich.`);
  }
  if (end.hour === PKW_DAY_END_HOUR && end.minute > 0) {
    throw new Error(`Terminende spätestens ${PKW_DAY_END_HOUR}:00 Uhr.`);
  }
  if (start.year !== end.year || start.month !== end.month || start.day !== end.day) {
    throw new Error("Start und Ende müssen am selben Tag liegen.");
  }
  if (new Date(slotEndIso).getTime() <= new Date(slotStartIso).getTime()) {
    throw new Error("Terminende muss nach Terminbeginn liegen.");
  }
}

/** Kein Termin in der Vergangenheit (Vergleich mit Serverzeit). */
export function assertSlotNotInPast(slotStartIso) {
  if (new Date(slotStartIso).getTime() < Date.now()) {
    throw new Error("Termine in der Vergangenheit sind nicht möglich.");
  }
}

export function isSlotInPast(slotStartIso) {
  return new Date(slotStartIso).getTime() < Date.now();
}

/** YYYY-MM-DD + Stunde → ISO-UTC für Europe/Vienna-Wandzeit. */
export function viennaLocalToIso(dateYmd, hour, minute = 0) {
  const [y, m, d] = dateYmd.split("-").map(Number);
  let utc = Date.UTC(y, m - 1, d, hour, minute);
  for (let i = 0; i < 6; i += 1) {
    const p = getViennaDateTimeParts(new Date(utc));
    if (p.year === y && p.month === m && p.day === d && p.hour === hour && p.minute === minute) {
      return new Date(utc).toISOString();
    }
    utc += (hour - p.hour) * 3_600_000 + (d - p.day) * 86_400_000;
  }
  return new Date(utc).toISOString();
}

function getViennaDateTimeParts(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PKW_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
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
