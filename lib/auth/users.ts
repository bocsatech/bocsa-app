import bcrypt from "bcryptjs";
import { supabase } from "../supabase";
import { getSupabaseAdmin } from "../supabaseAdmin";
import { normalizeSecretPin } from "./pin";
import {
  normalizeUserFilialeCode,
  type UserFilialeCode,
} from "../user-filiale";

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
  created_at?: string;
};

function getDb() {
  return getSupabaseAdmin() ?? supabase;
}

const USER_LIST_SELECT =
  "id, username, secret_pin, full_name, position, site, filiale_code, photo_url, signature_url, created_at";
const USER_LIST_SELECT_LEGACY =
  "id, username, secret_pin, full_name, position, site, photo_url, signature_url, created_at";

const USER_AUTH_SELECT =
  "id, username, password_hash, secret_pin, full_name, position, site, filiale_code, photo_url, signature_url, created_at";
const USER_AUTH_SELECT_LEGACY =
  "id, username, password_hash, secret_pin, full_name, position, site, photo_url, signature_url, created_at";

function isMissingFilialeColumn(error: { message?: string } | null) {
  const msg = String(error?.message ?? "").toLowerCase();
  return msg.includes("filiale_code") && msg.includes("does not exist");
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
  }
) {
  const db = getDb();
  const payload: Record<string, unknown> = {};

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

  if (Object.keys(payload).length === 0) {
    return { user: null, error: "Keine Änderungen übergeben." };
  }

  let { data, error } = await db
    .from(USERS_TABLE)
    .update(payload)
    .eq("id", id)
    .select(USER_LIST_SELECT)
    .single();

  if (error && isMissingFilialeColumn(error) && "filiale_code" in payload) {
    const { filiale_code: _omit, ...payloadWithoutFiliale } = payload;
    ({ data, error } = await db
      .from(USERS_TABLE)
      .update(payloadWithoutFiliale)
      .eq("id", id)
      .select(USER_LIST_SELECT_LEGACY)
      .single());
  }

  if (error) return { user: null, error: error.message };
  return { user: data, error: null };
}
