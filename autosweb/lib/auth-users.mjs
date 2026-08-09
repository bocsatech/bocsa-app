/**
 * Közös felhasználói fiók (web + mobil) — SQLite + token session.
 */
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getUsersDb, getUsersDbPath } from "./db-registry.mjs";

const TOKEN_BYTES = 32;
const SESSION_DAYS = 90;
const SCRYPT_KEYLEN = 64;

export function initAuthSchema(db = getUsersDb()) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      display_name TEXT,
      profile_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(String(password), salt, SCRYPT_KEYLEN).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  try {
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(String(expectedHash), "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
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

function parseProfile(raw) {
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw || "{}") : raw ?? {};
    return { ...emptyProfile(), ...obj };
  } catch {
    return emptyProfile();
  }
}

function publicUser(row) {
  const profile = parseProfile(row.profile_json);
  const displayName =
    row.display_name ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    row.email.split("@")[0];
  return {
    id: row.id,
    email: row.email,
    displayName,
    profile,
  };
}

function createSession(userId) {
  const db = getUsersDb();
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  db.prepare(
    `INSERT INTO auth_sessions (token, user_id, expires_at)
     VALUES (?, ?, datetime('now', '+${SESSION_DAYS} days'))`
  ).run(token, userId);
  return token;
}

function deleteSession(token) {
  if (!token) return;
  getUsersDb().prepare("DELETE FROM auth_sessions WHERE token = ?").run(token);
}

export function getUserByToken(token) {
  if (!token) return null;
  initAuthSchema();
  const db = getUsersDb();
  const row = db
    .prepare(
      `SELECT u.* FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`
    )
    .get(token);
  return row ? publicUser(row) : null;
}

export function extractBearerToken(req) {
  const header = req.headers?.authorization ?? req.headers?.Authorization ?? "";
  const m = String(header).match(/^Bearer\s+(.+)$/i);
  if (m) return m[1].trim();
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  return url.searchParams.get("token")?.trim() || null;
}

export function registerUser({ email, password, password_confirm }) {
  initAuthSchema();
  const trimmedEmail = normalizeEmail(email);
  const trimmedPassword = String(password ?? "").trim();
  const confirm = String(password_confirm ?? password ?? "").trim();

  if (!trimmedEmail || !trimmedPassword) {
    const err = new Error("Email és jelszó kötelező.");
    err.status = 400;
    throw err;
  }
  if (!trimmedEmail.includes("@")) {
    const err = new Error("Érvénytelen email cím.");
    err.status = 400;
    throw err;
  }
  if (trimmedPassword !== confirm) {
    const err = new Error("A két jelszó nem egyezik.");
    err.status = 400;
    throw err;
  }
  if (trimmedPassword.length < 4) {
    const err = new Error("A jelszó legalább 4 karakter legyen.");
    err.status = 400;
    throw err;
  }

  const db = getUsersDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(trimmedEmail);
  if (existing) {
    const err = new Error("Ez az email már regisztrálva van.");
    err.status = 409;
    throw err;
  }

  const { salt, hash } = hashPassword(trimmedPassword);
  const info = db
    .prepare(
      `INSERT INTO users (email, password_hash, password_salt, profile_json)
       VALUES (?, ?, ?, '{}')`
    )
    .run(trimmedEmail, hash, salt);

  const token = createSession(info.lastInsertRowid);
  const user = getUserByToken(token);
  return { ok: true, token, user };
}

export function loginUser({ email, password }) {
  initAuthSchema();
  const trimmedEmail = normalizeEmail(email);
  const trimmedPassword = String(password ?? "").trim();
  if (!trimmedEmail || !trimmedPassword) {
    const err = new Error("Email és jelszó kötelező.");
    err.status = 400;
    throw err;
  }

  const db = getUsersDb();
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(trimmedEmail);
  if (!row || !verifyPassword(trimmedPassword, row.password_salt, row.password_hash)) {
    const err = new Error("Hibás email vagy jelszó.");
    err.status = 401;
    throw err;
  }

  const token = createSession(row.id);
  return { ok: true, token, user: publicUser(row) };
}

export function logoutUser(token) {
  deleteSession(token);
  return { ok: true };
}

export function saveUserProfile(token, profileInput) {
  const user = getUserByToken(token);
  if (!user) {
    const err = new Error("Nem vagy bejelentkezve.");
    err.status = 401;
    throw err;
  }

  const next = {
    salutation: String(profileInput.salutation ?? "").trim(),
    firstName: String(profileInput.firstName ?? "").trim(),
    lastName: String(profileInput.lastName ?? "").trim(),
    street: String(profileInput.street ?? "").trim(),
    postalCode: String(profileInput.postalCode ?? "").trim(),
    city: String(profileInput.city ?? "").trim(),
    country: String(profileInput.country ?? "Magyarország").trim() || "Magyarország",
    phone: String(profileInput.phone ?? "").trim(),
    company: String(profileInput.company ?? "").trim(),
    accountType: profileInput.accountType === "business"
      ? "business"
      : profileInput.accountType === "dealer"
        ? "dealer"
        : "private",
  };

  if (!next.firstName || !next.lastName) {
    const err = new Error("A keresztnév és a vezetéknév kötelező.");
    err.status = 400;
    throw err;
  }
  if (!next.postalCode || !next.city) {
    const err = new Error("Az irányítószám és a város kötelező.");
    err.status = 400;
    throw err;
  }

  const displayName = [next.firstName, next.lastName].filter(Boolean).join(" ");
  const db = getUsersDb();
  db.prepare(
    `UPDATE users SET profile_json = ?, display_name = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(JSON.stringify(next), displayName, user.id);

  return { ok: true, user: getUserByToken(token) };
}

export function changeUserPassword(token, { current_password, new_password, new_password_confirm }) {
  const sessionUser = getUserByToken(token);
  if (!sessionUser) {
    const err = new Error("Nem vagy bejelentkezve.");
    err.status = 401;
    throw err;
  }

  const current = String(current_password ?? "").trim();
  const next = String(new_password ?? "").trim();
  const confirm = String(new_password_confirm ?? "").trim();
  if (!current || !next) {
    const err = new Error("A jelenlegi és az új jelszó kötelező.");
    err.status = 400;
    throw err;
  }
  if (next !== confirm) {
    const err = new Error("A két új jelszó nem egyezik.");
    err.status = 400;
    throw err;
  }
  if (next.length < 4) {
    const err = new Error("Az új jelszó legalább 4 karakter legyen.");
    err.status = 400;
    throw err;
  }

  const db = getUsersDb();
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(sessionUser.id);
  if (!row || !verifyPassword(current, row.password_salt, row.password_hash)) {
    const err = new Error("A jelenlegi jelszó hibás.");
    err.status = 400;
    throw err;
  }

  const { salt, hash } = hashPassword(next);
  db.prepare(
    `UPDATE users SET password_hash = ?, password_salt = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(hash, salt, row.id);

  return { ok: true };
}

export function authStats() {
  initAuthSchema();
  const db = getUsersDb();
  const users = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  const sessions = db
    .prepare("SELECT COUNT(*) AS n FROM auth_sessions WHERE expires_at > datetime('now')")
    .get().n;
  return { users, sessions, path: getUsersDbPath() };
}

/** Böngésző localStorage fiókok → szerver (session nélkül). */
export function importLocalAccounts(accounts = []) {
  initAuthSchema();
  const db = getUsersDb();
  const results = [];
  for (const account of (Array.isArray(accounts) ? accounts : []).slice(0, 50)) {
    const email = normalizeEmail(account?.email);
    const password = String(account?.password ?? "").trim();
    if (!email || !password) {
      results.push({ email: email || null, imported: false, reason: "invalid" });
      continue;
    }
    if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
      results.push({ email, imported: false, reason: "exists" });
      continue;
    }
    try {
      const profile = {
        ...emptyProfile(),
        ...(account.profile && typeof account.profile === "object" ? account.profile : {}),
        phone: account.phone ?? account.profile?.phone ?? "",
        postalCode: account.postalCode ?? account.profile?.postalCode ?? "",
        city: account.city ?? account.profile?.city ?? "",
      };
      const displayName =
        String(account.displayName ?? "").trim() ||
        [profile.firstName, profile.lastName].filter(Boolean).join(" ");
      const { salt, hash } = hashPassword(password);
      db.prepare(
        `INSERT INTO users (email, password_hash, password_salt, display_name, profile_json)
         VALUES (?, ?, ?, ?, ?)`
      ).run(email, hash, salt, displayName || null, JSON.stringify(profile));
      results.push({ email, imported: true });
    } catch (e) {
      results.push({ email, imported: false, reason: e.message || "error" });
    }
  }
  return { ok: true, results };
}

export function deleteUserAccount(token) {
  const user = getUserByToken(token);
  if (!user) {
    const err = new Error("Nem vagy bejelentkezve.");
    err.status = 401;
    throw err;
  }
  const db = getUsersDb();
  db.prepare("DELETE FROM auth_sessions WHERE user_id = ?").run(user.id);
  db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
  return { ok: true };
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  });
  res.end(JSON.stringify(data));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

/** /api/auth/* — közös fiók web + mobil. */
export async function handleAuthApi(req, res, pathname) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    });
    res.end();
    return true;
  }

  try {
    if (pathname === "/api/auth/register" && req.method === "POST") {
      const body = await readJsonBody(req);
      const result = registerUser(body);
      sendJson(res, 201, result);
      return true;
    }

    if (pathname === "/api/auth/login" && req.method === "POST") {
      const body = await readJsonBody(req);
      sendJson(res, 200, loginUser(body));
      return true;
    }

    if (pathname === "/api/auth/logout" && req.method === "POST") {
      logoutUser(extractBearerToken(req));
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (pathname === "/api/auth/me" && req.method === "GET") {
      const user = getUserByToken(extractBearerToken(req));
      if (!user) {
        sendJson(res, 401, { ok: false, error: "Nem vagy bejelentkezve." });
        return true;
      }
      sendJson(res, 200, { ok: true, user });
      return true;
    }

    if (pathname === "/api/auth/profile" && req.method === "PUT") {
      const body = await readJsonBody(req);
      sendJson(res, 200, saveUserProfile(extractBearerToken(req), body));
      return true;
    }

    if (pathname === "/api/auth/password" && req.method === "POST") {
      const body = await readJsonBody(req);
      sendJson(res, 200, changeUserPassword(extractBearerToken(req), body));
      return true;
    }

    if (pathname === "/api/auth/import-local" && req.method === "POST") {
      const body = await readJsonBody(req);
      sendJson(res, 200, importLocalAccounts(body.accounts));
      return true;
    }

    if (pathname === "/api/auth/account" && req.method === "DELETE") {
      sendJson(res, 200, deleteUserAccount(extractBearerToken(req)));
      return true;
    }

    if (pathname === "/api/auth/stats" && req.method === "GET") {
      sendJson(res, 200, { ok: true, ...authStats() });
      return true;
    }

    sendJson(res, 404, { ok: false, error: "Ismeretlen auth API." });
    return true;
  } catch (error) {
    const status = error.status || (error instanceof SyntaxError ? 400 : 500);
    sendJson(res, status, { ok: false, error: error.message ?? String(error) });
    return true;
  }
}
