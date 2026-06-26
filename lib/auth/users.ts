import bcrypt from "bcryptjs";
import { supabase } from "../supabase";
import { getSupabaseAdmin } from "../supabaseAdmin";
import { normalizeSecretPin } from "./pin";
import {
  normalizeUserFilialeCode,
  type UserFilialeCode,
} from "../user-filiale";
import {
  normalizeUserWorkArea,
  STAMMDATEN_USER_COLUMNS,
  type UserWorkArea,
} from "../user-stammdaten";
import { ensureUsersFilialeColumn } from "../users-filiale-setup.mjs";

export const USERS_TABLE = "users";

export type AppUser = {
  id: string;
  username: string;
  password_hash: string;
  secret_pin: number | null;
  full_name?: string | null;
  position?: string | null;
  site?: string | null;
  filiale_code?: UserFilialeCode | null;
  photo_url?: string | null;
  signature_url?: string | null;
  company_mobile?: string | null;
  private_mobile?: string | null;
  company_email?: string | null;
  private_email?: string | null;
  birth_date?: string | null;
  address?: string | null;
  ecard_number?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  bank_account?: string | null;
  direct_manager?: string | null;
  work_area?: UserWorkArea | null;
  overtime_hours_balance?: number | null;
  is_active?: boolean;
  created_at?: string;
};

function getDb() {
  return getSupabaseAdmin() ?? supabase;
}

const USER_PERSONAL_COLUMNS =
  "company_mobile, private_mobile, company_email, private_email, birth_date, address, ecard_number, emergency_contact_name, emergency_contact_phone";
const USER_EXTENDED_COLUMNS = `${USER_PERSONAL_COLUMNS}, ${STAMMDATEN_USER_COLUMNS}`;

const USER_LIST_SELECT =
  `id, username, secret_pin, full_name, position, site, filiale_code, photo_url, signature_url, is_active, ${USER_EXTENDED_COLUMNS}, created_at`;
const USER_LIST_SELECT_LEGACY =
  "id, username, secret_pin, full_name, position, site, photo_url, signature_url, created_at";
const USER_LIST_SELECT_NO_PERSONAL =
  "id, username, secret_pin, full_name, position, site, filiale_code, photo_url, signature_url, is_active, created_at";
const USER_LIST_SELECT_NO_ACTIVE =
  "id, username, secret_pin, full_name, position, site, filiale_code, photo_url, signature_url, created_at";

const USER_AUTH_SELECT =
  `id, username, password_hash, secret_pin, full_name, position, site, filiale_code, photo_url, signature_url, is_active, ${USER_EXTENDED_COLUMNS}, created_at`;
const USER_AUTH_SELECT_LEGACY =
  "id, username, password_hash, secret_pin, full_name, position, site, photo_url, signature_url, created_at";
const USER_AUTH_SELECT_NO_PERSONAL =
  "id, username, password_hash, secret_pin, full_name, position, site, filiale_code, photo_url, signature_url, is_active, created_at";
const USER_AUTH_SELECT_NO_ACTIVE =
  `id, username, password_hash, secret_pin, full_name, position, site, filiale_code, photo_url, signature_url, ${USER_EXTENDED_COLUMNS}, created_at`;

function isMissingStammdatenColumn(
  error: { message?: string; code?: string } | null
) {
  const msg = String(error?.message ?? "").toLowerCase();
  const columns = ["bank_account", "direct_manager", "work_area", "overtime_hours_balance"];
  if (!columns.some((column) => msg.includes(column))) return false;
  const code = String(error?.code ?? "").toUpperCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    code === "42703" ||
    code === "PGRST204"
  );
}

function isMissingPersonalColumn(
  error: { message?: string; code?: string } | null
) {
  const msg = String(error?.message ?? "").toLowerCase();
  const personalColumns = [
    "company_mobile",
    "private_mobile",
    "company_email",
    "private_email",
    "birth_date",
    "address",
    "ecard_number",
    "emergency_contact_name",
    "emergency_contact_phone",
  ];
  if (!personalColumns.some((column) => msg.includes(column))) return false;
  const code = String(error?.code ?? "").toUpperCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    code === "PGRST204"
  );
}

function optionalText(value: unknown) {
  if (value === undefined) return undefined;
  const text = String(value ?? "").trim();
  return text || null;
}

const PERSONAL_PAYLOAD_KEYS = [
  "company_mobile",
  "private_mobile",
  "company_email",
  "private_email",
  "birth_date",
  "address",
  "ecard_number",
  "emergency_contact_name",
  "emergency_contact_phone",
] as const;

const STAMMDATEN_PAYLOAD_KEYS = [
  "bank_account",
  "direct_manager",
  "work_area",
  "overtime_hours_balance",
] as const;

function stripPersonalPayload(payload: Record<string, unknown>) {
  const next = { ...payload };
  for (const key of PERSONAL_PAYLOAD_KEYS) {
    delete next[key];
  }
  return next;
}

function stripStammdatenPayload(payload: Record<string, unknown>) {
  const next = { ...payload };
  for (const key of STAMMDATEN_PAYLOAD_KEYS) {
    delete next[key];
  }
  return next;
}

const USER_LIST_SELECT_NO_STAMMDATEN =
  `id, username, secret_pin, full_name, position, site, filiale_code, photo_url, signature_url, is_active, ${USER_PERSONAL_COLUMNS}, created_at`;

function isMissingActiveColumn(
  error: { message?: string; code?: string } | null
) {
  const msg = String(error?.message ?? "").toLowerCase();
  if (!msg.includes("is_active")) return false;
  const code = String(error?.code ?? "").toUpperCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    code === "PGRST204"
  );
}

function isMissingFilialeColumn(
  error: { message?: string; code?: string } | null
) {
  const msg = String(error?.message ?? "").toLowerCase();
  if (!msg.includes("filiale_code")) return false;
  const code = String(error?.code ?? "").toUpperCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    code === "PGRST204"
  );
}

function normalizeUsername(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function readIsActive(row: Record<string, unknown>) {
  if (row.is_active === false) return false;
  if (row.is_active === true) return true;
  return true;
}

function mapUser(row: Record<string, unknown> | null): AppUser | null {
  if (!row) return null;

  const username = row.username;
  const password_hash = row.password_hash;

  if (typeof username !== "string" || typeof password_hash !== "string") {
    return null;
  }

  const secretPinRaw = row.secret_pin;
  const secret_pin =
    secretPinRaw === null || secretPinRaw === undefined
      ? null
      : Number(secretPinRaw);

  return {
    id: String(row.id),
    username,
    password_hash,
    secret_pin: Number.isInteger(secret_pin) ? secret_pin : null,
    full_name:
      typeof row.full_name === "string" ? row.full_name : null,
    position:
      typeof row.position === "string" ? row.position : null,
    site:
      typeof row.site === "string" ? row.site : null,
    filiale_code: normalizeUserFilialeCode(row.filiale_code),
    photo_url:
      typeof row.photo_url === "string" ? row.photo_url : null,
    signature_url:
      typeof row.signature_url === "string" ? row.signature_url : null,
    company_mobile:
      typeof row.company_mobile === "string" ? row.company_mobile : null,
    private_mobile:
      typeof row.private_mobile === "string" ? row.private_mobile : null,
    company_email:
      typeof row.company_email === "string" ? row.company_email : null,
    private_email:
      typeof row.private_email === "string" ? row.private_email : null,
    birth_date:
      typeof row.birth_date === "string" ? row.birth_date : null,
    address: typeof row.address === "string" ? row.address : null,
    ecard_number:
      typeof row.ecard_number === "string" ? row.ecard_number : null,
    emergency_contact_name:
      typeof row.emergency_contact_name === "string"
        ? row.emergency_contact_name
        : null,
    emergency_contact_phone:
      typeof row.emergency_contact_phone === "string"
        ? row.emergency_contact_phone
        : null,
    is_active: readIsActive(row),
    created_at:
      typeof row.created_at === "string" ? row.created_at : undefined,
  };
}

export async function findUserByUsername(username: string) {
  const db = getDb();
  const normalized = username.trim().toLowerCase();

  let { data, error } = await db
    .from(USERS_TABLE)
    .select(USER_AUTH_SELECT)
    .eq("username", normalized)
    .maybeSingle();

  if (error && isMissingFilialeColumn(error)) {
    ({ data, error } = await db
      .from(USERS_TABLE)
      .select(USER_AUTH_SELECT_NO_PERSONAL)
      .eq("username", normalized)
      .maybeSingle());
  }

  if (error && isMissingPersonalColumn(error)) {
    ({ data, error } = await db
      .from(USERS_TABLE)
      .select(USER_AUTH_SELECT_NO_PERSONAL)
      .eq("username", normalized)
      .maybeSingle());
  }

  if (error && isMissingActiveColumn(error)) {
    ({ data, error } = await db
      .from(USERS_TABLE)
      .select(USER_AUTH_SELECT_NO_ACTIVE)
      .eq("username", normalized)
      .maybeSingle());
  }

  if (error && isMissingFilialeColumn(error)) {
    ({ data, error } = await db
      .from(USERS_TABLE)
      .select(USER_AUTH_SELECT_LEGACY)
      .eq("username", normalized)
      .maybeSingle());
  }

  if (error) {
    if (error.code === "PGRST205") {
      return {
        user: null,
        error:
          'Tabelle "users" fehlt oder Spalten fehlen. Bitte supabase/users-setup.sql im SQL Editor ausführen.',
      };
    }
    return { user: null, error: error.message };
  }

  return { user: mapUser(data), error: null };
}

export async function verifyPassword(password: string, passwordHash: string) {
  if (passwordHash.startsWith("$2a$") || passwordHash.startsWith("$2b$")) {
    return bcrypt.compare(password, passwordHash);
  }

  // Temporary support for demo users that were inserted with plain text passwords.
  return password === passwordHash;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function createUser(
  username: string,
  password: string,
  secretPin: number,
  filialeCode?: UserFilialeCode | null
) {
  const pin = normalizeSecretPin(secretPin);
  if (pin === null) {
    return { user: null, error: "Geheimzahl muss zwischen 0 und 99 liegen." };
  }

  const db = getDb();
  const password_hash = await hashPassword(password);

  const insertBase = {
    username: username.trim().toLowerCase(),
    password_hash,
    secret_pin: pin,
  };

  let { data, error } = await db
    .from(USERS_TABLE)
    .insert({ ...insertBase, filiale_code: filialeCode ?? null })
    .select("id, username, secret_pin, filiale_code")
    .single();

  if (error && isMissingFilialeColumn(error)) {
    if (await ensureUsersFilialeColumn()) {
      ({ data, error } = await db
        .from(USERS_TABLE)
        .insert({ ...insertBase, filiale_code: filialeCode ?? null })
        .select("id, username, secret_pin, filiale_code")
        .single());
    }
  }

  if (error && isMissingFilialeColumn(error)) {
    ({ data, error } = await db
      .from(USERS_TABLE)
      .insert(insertBase)
      .select("id, username, secret_pin")
      .single());
  }

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data, error: null };
}

export async function listUsers() {
  const db = getDb();
  let { data, error } = await db
    .from(USERS_TABLE)
    .select(USER_LIST_SELECT)
    .order("created_at", { ascending: false });

  if (error && isMissingFilialeColumn(error)) {
    if (await ensureUsersFilialeColumn()) {
      ({ data, error } = await db
        .from(USERS_TABLE)
        .select(USER_LIST_SELECT)
        .order("created_at", { ascending: false }));
    }
  }

  if (error && isMissingFilialeColumn(error)) {
    ({ data, error } = await db
      .from(USERS_TABLE)
      .select(USER_LIST_SELECT_NO_PERSONAL)
      .order("created_at", { ascending: false }));
  }

  if (error && isMissingPersonalColumn(error)) {
    ({ data, error } = await db
      .from(USERS_TABLE)
      .select(USER_LIST_SELECT_NO_PERSONAL)
      .order("created_at", { ascending: false }));
  }

  if (error && isMissingActiveColumn(error)) {
    ({ data, error } = await db
      .from(USERS_TABLE)
      .select(USER_LIST_SELECT_NO_ACTIVE)
      .order("created_at", { ascending: false }));
  }

  if (error && isMissingFilialeColumn(error)) {
    ({ data, error } = await db
      .from(USERS_TABLE)
      .select(USER_LIST_SELECT_LEGACY)
      .order("created_at", { ascending: false }));
  }

  if (error) return { users: null, error: error.message };
  return { users: (data ?? []) as Array<Record<string, unknown>>, error: null };
}

export async function updateUserById(
  id: string,
  patch: {
    password?: string;
    secretPin?: number | null;
    fullName?: string;
    position?: string;
    site?: string;
    filialeCode?: UserFilialeCode | null;
    photoUrl?: string;
    signatureUrl?: string;
    companyMobile?: string;
    privateMobile?: string;
    companyEmail?: string;
    privateEmail?: string;
    birthDate?: string;
    address?: string;
    ecardNumber?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    bankAccount?: string;
    directManager?: string;
    workArea?: UserWorkArea | null;
    overtimeHoursBalance?: number;
    username?: string;
    isActive?: boolean;
  }
) {
  const db = getDb();
  const payload: Record<string, unknown> = {};

  if (patch.username !== undefined) {
    const normalized = normalizeUsername(patch.username);
    if (!normalized) {
      return { user: null, error: "Benutzername darf nicht leer sein." };
    }
    const existing = await findUserByUsername(normalized);
    if (existing.error) {
      return { user: null, error: existing.error };
    }
    if (existing.user && existing.user.id !== id) {
      return { user: null, error: "Benutzername ist bereits vergeben." };
    }
    payload.username = normalized;
  }
  if (patch.isActive !== undefined) payload.is_active = patch.isActive;

  if (typeof patch.password === "string" && patch.password.length > 0) {
    payload.password_hash = await hashPassword(patch.password);
  }
  if (patch.secretPin !== undefined) {
    const pin = normalizeSecretPin(patch.secretPin);
    if (pin === null) {
      return { user: null, error: "Geheimzahl muss zwischen 0 und 99 liegen." };
    }
    payload.secret_pin = pin;
  }
  if (patch.fullName !== undefined) payload.full_name = patch.fullName.trim() || null;
  if (patch.position !== undefined) payload.position = patch.position.trim() || null;
  if (patch.site !== undefined) payload.site = patch.site.trim() || null;
  if (patch.filialeCode !== undefined) {
    payload.filiale_code =
      patch.filialeCode === null ? null : normalizeUserFilialeCode(patch.filialeCode);
  }
  if (patch.photoUrl !== undefined) payload.photo_url = patch.photoUrl.trim() || null;
  if (patch.signatureUrl !== undefined)
    payload.signature_url = patch.signatureUrl.trim() || null;
  if (patch.companyMobile !== undefined)
    payload.company_mobile = optionalText(patch.companyMobile);
  if (patch.privateMobile !== undefined)
    payload.private_mobile = optionalText(patch.privateMobile);
  if (patch.companyEmail !== undefined)
    payload.company_email = optionalText(patch.companyEmail);
  if (patch.privateEmail !== undefined)
    payload.private_email = optionalText(patch.privateEmail);
  if (patch.birthDate !== undefined)
    payload.birth_date = optionalText(patch.birthDate);
  if (patch.address !== undefined) payload.address = optionalText(patch.address);
  if (patch.ecardNumber !== undefined)
    payload.ecard_number = optionalText(patch.ecardNumber);
  if (patch.emergencyContactName !== undefined)
    payload.emergency_contact_name = optionalText(patch.emergencyContactName);
  if (patch.emergencyContactPhone !== undefined)
    payload.emergency_contact_phone = optionalText(patch.emergencyContactPhone);
  if (patch.bankAccount !== undefined)
    payload.bank_account = optionalText(patch.bankAccount);
  if (patch.directManager !== undefined)
    payload.direct_manager = optionalText(patch.directManager);
  if (patch.workArea !== undefined) {
    if (patch.workArea === null || patch.workArea === "") {
      payload.work_area = null;
    } else {
      const area = normalizeUserWorkArea(patch.workArea);
      if (!area) {
        return {
          user: null,
          error: "Ungültiger Arbeitsbereich. Erlaubt: Lager, Werkstatt.",
        };
      }
      payload.work_area = area;
    }
  }
  if (patch.overtimeHoursBalance !== undefined) {
    const numeric = Number(patch.overtimeHoursBalance);
    payload.overtime_hours_balance = Number.isFinite(numeric)
      ? Math.round(numeric * 100) / 100
      : 0;
  }

  if (Object.keys(payload).length === 0) {
    return { user: null, error: "Keine Änderungen übergeben." };
  }

  let { data, error } = await db
    .from(USERS_TABLE)
    .update(payload)
    .eq("id", id)
    .select(USER_LIST_SELECT)
    .single();

  if (error && isMissingFilialeColumn(error)) {
    if (await ensureUsersFilialeColumn()) {
      ({ data, error } = await db
        .from(USERS_TABLE)
        .update(payload)
        .eq("id", id)
        .select(USER_LIST_SELECT)
        .single());
    }
  }

  if (error && isMissingActiveColumn(error)) {
    const { is_active: _omit, ...updatePayload } = payload;
    if ("is_active" in payload && Object.keys(updatePayload).length === 0) {
      return {
        user: null,
        error:
          'Spalte "is_active" fehlt. Bitte supabase/users-is-active.sql im Supabase SQL Editor ausführen.',
      };
    }
    ({ data, error } = await db
      .from(USERS_TABLE)
      .update("is_active" in payload ? updatePayload : payload)
      .eq("id", id)
      .select(USER_LIST_SELECT_NO_ACTIVE)
      .single());
  }

  if (error && isMissingStammdatenColumn(error)) {
    const updatePayload = stripStammdatenPayload(payload);
    if (Object.keys(updatePayload).length === 0) {
      return {
        user: null,
        error:
          'Stammdaten-Felder fehlen in der Datenbank. Bitte supabase/users-stammdaten-fields.sql im Supabase SQL Editor ausführen.',
      };
    }
    ({ data, error } = await db
      .from(USERS_TABLE)
      .update(updatePayload)
      .eq("id", id)
      .select(USER_LIST_SELECT_NO_STAMMDATEN)
      .single());
  }

  if (error && isMissingPersonalColumn(error)) {
    const updatePayload = stripPersonalPayload(payload);
    if (Object.keys(updatePayload).length === 0) {
      return {
        user: null,
        error:
          'Persönliche Felder fehlen in der Datenbank. Bitte supabase/users-personal-fields.sql im Supabase SQL Editor ausführen.',
      };
    }
    ({ data, error } = await db
      .from(USERS_TABLE)
      .update(updatePayload)
      .eq("id", id)
      .select(USER_LIST_SELECT_NO_PERSONAL)
      .single());
  }

  if (error && isMissingFilialeColumn(error)) {
    const { filiale_code: _omit, ...payloadWithoutFiliale } = payload;
    const updatePayload =
      "filiale_code" in payload ? payloadWithoutFiliale : payload;
    if (Object.keys(updatePayload).length === 0) {
      return {
        user: null,
        error:
          'Spalte "filiale_code" fehlt. Bitte supabase/users-filiale-patch.sql im Supabase SQL Editor ausführen.',
      };
    }
    ({ data, error } = await db
      .from(USERS_TABLE)
      .update(updatePayload)
      .eq("id", id)
      .select(USER_LIST_SELECT_LEGACY)
      .single());
  }

  if (error) return { user: null, error: error.message };
  return { user: data, error: null };
}

export async function deleteUserById(id: string) {
  const db = getDb();
  const { error } = await db.from(USERS_TABLE).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}
