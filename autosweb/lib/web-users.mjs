/** Autosweb web userek — helyi SQLite (localhost), nem Supabase. */

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getDb, getDbPath } from "./db.mjs";
import {
  deleteProfileFromFile,
  loadProfileFromFile,
  saveProfileToFile,
  getProfilesFilePath,
  readProfilesStore,
} from "./web-user-profiles.mjs";

const SESSION_DAYS = 30;
const SESSION_COOKIE = "autosweb_session";

export { SESSION_COOKIE, getProfilesFilePath };

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(String(password), salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(String(expectedHash ?? ""), "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function emptyProfile() {
  return {
    salutation: "",
    firstName: "",
    lastName: "",
    street: "",
    postalCode: "",
    city: "",
    country: "Magyarország",
    phone: "",
    company: "",
    accountType: "private",
  };
}

function profileFromRow(row) {
  if (!row) return emptyProfile();
  let parsed = {};
  try {
    parsed = row.profile_json ? JSON.parse(row.profile_json) : {};
  } catch {
    parsed = {};
  }
  const fromFile = loadProfileFromFile(row.email);
  // Fájl az elsődleges (túléli DB útvonal-váltást); SQLite a másodlagos.
  const merged = { ...emptyProfile(), ...parsed, ...(fromFile || {}) };
  delete merged.savedAt;
  return merged;
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name || null,
    profile: profileFromRow(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function initWebUsersSchema(db = getDb()) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS web_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      profile_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS web_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES web_users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_web_sessions_user ON web_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_web_sessions_expires ON web_sessions(expires_at);
  `);
}

function tokenHash(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

function createSession(userId) {
  const db = getDb();
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const expiresAt = expires.toISOString().slice(0, 19).replace("T", " ");
  db.prepare(
    `INSERT INTO web_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`
  ).run(tokenHash(token), userId, expiresAt);
  return { token, expires };
}

export function destroySession(token) {
  if (!token) return;
  const db = getDb();
  db.prepare(`DELETE FROM web_sessions WHERE token_hash = ?`).run(tokenHash(token));
}

export function getUserBySessionToken(token) {
  if (!token) return null;
  const db = getDb();
  db.prepare(`DELETE FROM web_sessions WHERE expires_at < datetime('now')`).run();
  const row = db
    .prepare(
      `SELECT u.*
       FROM web_sessions s
       JOIN web_users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at >= datetime('now')`
    )
    .get(tokenHash(token));
  return publicUser(row);
}

export function registerUser(email, password, passwordConfirm) {
  const normalized = normalizeEmail(email);
  const pass = String(password ?? "").trim();
  const confirm = String(passwordConfirm ?? "").trim();
  if (!normalized || !pass) {
    throw new Error("Email és jelszó kötelező.");
  }
  if (!normalized.includes("@")) {
    throw new Error("Érvénytelen email cím.");
  }
  if (pass.length < 4) {
    throw new Error("A jelszó legalább 4 karakter legyen.");
  }
  if (pass !== confirm) {
    throw new Error("A két jelszó nem egyezik.");
  }

  const db = getDb();
  const existing = db.prepare(`SELECT id FROM web_users WHERE email = ?`).get(normalized);
  if (existing) {
    throw new Error("Ez az email már regisztrálva van.");
  }

  const { salt, hash } = hashPassword(pass);
  const info = db
    .prepare(
      `INSERT INTO web_users (email, password_salt, password_hash, profile_json)
       VALUES (?, ?, ?, '{}')`
    )
    .run(normalized, salt, hash);

  const session = createSession(Number(info.lastInsertRowid));
  const user = getUserBySessionToken(session.token);
  return { user, session };
}

export function loginUser(email, password) {
  const normalized = normalizeEmail(email);
  const pass = String(password ?? "").trim();
  if (!normalized || !pass) {
    throw new Error("Email és jelszó kötelező.");
  }

  const db = getDb();
  const row = db.prepare(`SELECT * FROM web_users WHERE email = ?`).get(normalized);
  if (!row || !verifyPassword(pass, row.password_salt, row.password_hash)) {
    throw new Error("Hibás email vagy jelszó.");
  }

  const session = createSession(row.id);
  return { user: publicUser(row), session };
}

export function changeUserPassword(userId, currentPassword, newPassword, newPasswordConfirm) {
  const current = String(currentPassword ?? "").trim();
  const next = String(newPassword ?? "").trim();
  const confirm = String(newPasswordConfirm ?? "").trim();
  if (!current || !next) throw new Error("A jelenlegi és az új jelszó kötelező.");
  if (next !== confirm) throw new Error("A két új jelszó nem egyezik.");
  if (next.length < 4) throw new Error("Az új jelszó legalább 4 karakter legyen.");

  const db = getDb();
  const row = db.prepare(`SELECT * FROM web_users WHERE id = ?`).get(userId);
  if (!row) throw new Error("Nem vagy bejelentkezve.");
  if (!verifyPassword(current, row.password_salt, row.password_hash)) {
    throw new Error("A jelenlegi jelszó hibás.");
  }

  const { salt, hash } = hashPassword(next);
  db.prepare(
    `UPDATE web_users
     SET password_salt = ?, password_hash = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(salt, hash, userId);
}

export function setUserDisplayName(userId, name) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) throw new Error("A megjelenített név kötelező.");
  if (trimmed.length > 40) throw new Error("A név maximum 40 karakter lehet.");
  const db = getDb();
  db.prepare(
    `UPDATE web_users SET display_name = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(trimmed, userId);
  return trimmed;
}

export function saveUserProfile(userId, profile) {
  const next = {
    salutation: String(profile.salutation ?? "").trim(),
    firstName: String(profile.firstName ?? "").trim(),
    lastName: String(profile.lastName ?? "").trim(),
    street: String(profile.street ?? "").trim(),
    postalCode: String(profile.postalCode ?? "").trim(),
    city: String(profile.city ?? "").trim(),
    country: String(profile.country ?? "Magyarország").trim() || "Magyarország",
    phone: String(profile.phone ?? "").trim(),
    company: String(profile.company ?? "").trim(),
    accountType: profile.accountType === "business" ? "business" : "private",
  };
  if (!next.firstName || !next.lastName) {
    throw new Error("A keresztnév és a vezetéknév kötelező.");
  }

  const displayName = [next.firstName, next.lastName].filter(Boolean).join(" ");
  const db = getDb();
  const row = db.prepare(`SELECT email FROM web_users WHERE id = ?`).get(userId);
  if (!row?.email) {
    throw new Error("A profil mentése sikertelen (nincs ilyen felhasználó).");
  }

  const fileResult = saveProfileToFile(row.email, next);

  const info = db
    .prepare(
      `UPDATE web_users
       SET profile_json = ?, display_name = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(JSON.stringify(next), displayName, userId);
  if (!info.changes) {
    throw new Error("A profil mentése sikertelen (nincs ilyen felhasználó).");
  }
  const verify = profileFromRow(db.prepare(`SELECT email, profile_json FROM web_users WHERE id = ?`).get(userId));
  if (verify.firstName !== next.firstName) {
    throw new Error("A profil mentése nem íródott a helyi adatbázisba.");
  }
  return { ...next, _savedTo: fileResult.path };
}

export function deleteUserAccount(userId) {
  const db = getDb();
  const row = db.prepare(`SELECT email FROM web_users WHERE id = ?`).get(userId);
  db.prepare(`DELETE FROM web_sessions WHERE user_id = ?`).run(userId);
  db.prepare(`DELETE FROM web_users WHERE id = ?`).run(userId);
  if (row?.email) deleteProfileFromFile(row.email);
}

export function parseCookies(header) {
  const out = {};
  for (const part of String(header ?? "").split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export function getUserById(userId) {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM web_users WHERE id = ?`).get(userId);
  return publicUser(row);
}

export function countWebUsers() {
  const db = getDb();
  const row = db.prepare(`SELECT COUNT(*) AS n FROM web_users`).get();
  return Number(row?.n ?? 0);
}

/** Nyers DB + profiles.json tartalom — hibakereséshez. */
export function inspectWebUsersDb() {
  const db = getDb();
  const users = db
    .prepare(
      `SELECT id, email, display_name, profile_json, created_at, updated_at FROM web_users ORDER BY id`
    )
    .all()
    .map((row) => {
      let profile = {};
      try {
        profile = row.profile_json ? JSON.parse(row.profile_json) : {};
      } catch {
        profile = { _parseError: true, raw: row.profile_json };
      }
      const fromFile = loadProfileFromFile(row.email);
      return {
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        sqliteProfile: profile,
        fileProfile: fromFile,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });
  const sessionCount = Number(
    db.prepare(`SELECT COUNT(*) AS n FROM web_sessions WHERE expires_at >= datetime('now')`).get()?.n ?? 0
  );
  return {
    dbPath: getDbPath(),
    profilesPath: getProfilesFilePath(),
    userCount: users.length,
    sessionCount,
    users,
    profilesFile: readProfilesStore(),
  };
}

export function getSessionTokenFromRequest(req) {
  const cookies = parseCookies(req.headers?.cookie);
  if (cookies[SESSION_COOKIE]) return cookies[SESSION_COOKIE];
  const auth = String(req.headers?.authorization ?? "");
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return "";
}

export function sessionCookieHeader(token, expires) {
  const maxAge = Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000));
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
