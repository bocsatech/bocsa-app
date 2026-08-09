/**
 * Helyi (saját gép) adatbázisok — külön fájl:
 *   users.db      — felhasználók / session
 *   listings.db   — hirdetések
 *   messages.db   — üzenetek / push
 *
 * AUTOSWEB_DATA_DIR → mappa (alap: autosweb/data)
 * AUTOSWEB_DB_PATH  → legacy: a fájl könyvtárát használjuk data dir-ként (tesztek)
 */
import { mkdirSync, existsSync, renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = join(__dirname, "..", "data");

const cache = {
  dataDir: null,
  users: null,
  listings: null,
  messages: null,
  usersPath: null,
  listingsPath: null,
  messagesPath: null,
  migrated: false,
};

export function resolveDataDir() {
  if (process.env.AUTOSWEB_DATA_DIR) {
    return process.env.AUTOSWEB_DATA_DIR;
  }
  if (process.env.AUTOSWEB_DB_PATH) {
    return dirname(process.env.AUTOSWEB_DB_PATH);
  }
  return DEFAULT_DATA_DIR;
}

export function getUsersDbPath() {
  return join(resolveDataDir(), "users.db");
}

export function getListingsDbPath() {
  return join(resolveDataDir(), "listings.db");
}

export function getMessagesDbPath() {
  return join(resolveDataDir(), "messages.db");
}

/** @deprecated Használd getListingsDbPath / getDbPaths */
export function getLegacyAutoswebDbPath() {
  return join(resolveDataDir(), "autosweb.db");
}

export function getDbPaths() {
  return {
    users: getUsersDbPath(),
    listings: getListingsDbPath(),
    messages: getMessagesDbPath(),
    dataDir: resolveDataDir(),
  };
}

function openDb(path) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
}

function cached(kind, pathKey, path) {
  if (cache.dataDir !== resolveDataDir()) {
    cache.users = null;
    cache.listings = null;
    cache.messages = null;
    cache.usersPath = null;
    cache.listingsPath = null;
    cache.messagesPath = null;
    cache.dataDir = resolveDataDir();
    cache.migrated = false;
  }
  if (cache[kind] && cache[pathKey] === path) return cache[kind];
  cache[kind] = openDb(path);
  cache[pathKey] = path;
  return cache[kind];
}

export function getUsersDb() {
  return cached("users", "usersPath", getUsersDbPath());
}

export function getListingsDb() {
  return cached("listings", "listingsPath", getListingsDbPath());
}

export function getMessagesDb() {
  return cached("messages", "messagesPath", getMessagesDbPath());
}

function tableExists(db, name) {
  try {
    return Boolean(
      db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name)
    );
  } catch {
    return false;
  }
}

function tableCount(db, name) {
  if (!tableExists(db, name)) return 0;
  try {
    return db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get().n;
  } catch {
    return 0;
  }
}

function copyTable(src, dest, table) {
  if (!tableExists(src, table)) return 0;
  const rows = src.prepare(`SELECT * FROM ${table}`).all();
  if (!rows.length) return 0;
  // Cél tábla legyen létrehozva a hívó séma-initje által; ha nincs, kihagyjuk.
  if (!tableExists(dest, table)) return 0;
  const cols = Object.keys(rows[0]);
  const placeholders = cols.map(() => "?").join(",");
  const sql = `INSERT OR IGNORE INTO ${table} (${cols.join(",")}) VALUES (${placeholders})`;
  const stmt = dest.prepare(sql);
  let n = 0;
  for (const row of rows) {
    const r = stmt.run(...cols.map((c) => row[c]));
    if (r.changes) n += 1;
  }
  return n;
}

/**
 * Egyszeri átmásolás autosweb.db → users.db / listings.db / messages.db
 * (ha a legacy létezik, és az új fájlok üresek / hiányoznak).
 */
export function migrateLegacyAutoswebDb() {
  if (cache.migrated) return { migrated: false, reason: "already" };
  cache.migrated = true;

  const dir = resolveDataDir();
  const legacyPath = join(dir, "autosweb.db");
  if (!existsSync(legacyPath)) return { migrated: false, reason: "no-legacy" };

  const usersPath = getUsersDbPath();
  const listingsPath = getListingsDbPath();
  const messagesPath = getMessagesDbPath();

  // Nyitás séma nélkül is — a táblákat a másolás előtt a modulok initjei hozzák létre.
  // Itt csak akkor másolunk, ha a hívó már inicializálta a sémákat (táblák léteznek).
  const users = cached("users", "usersPath", usersPath);
  const listings = cached("listings", "listingsPath", listingsPath);
  const messages = cached("messages", "messagesPath", messagesPath);

  const legacy = new DatabaseSync(legacyPath);

  const needUsers = tableExists(users, "users") && tableCount(users, "users") === 0 && tableCount(legacy, "users") > 0;
  const needListings =
    tableExists(listings, "listings") &&
    tableCount(listings, "listings") === 0 &&
    tableCount(legacy, "listings") > 0;
  const needMessages =
    tableExists(messages, "conversations") &&
    tableCount(messages, "conversations") === 0 &&
    tableCount(legacy, "conversations") > 0;

  if (!needUsers && !needListings && !needMessages) {
    try {
      legacy.close?.();
    } catch {
      /* ignore */
    }
    return { migrated: false, reason: "target-has-data-or-empty-legacy" };
  }

  const copied = {};
  if (needUsers) {
    copied.users = copyTable(legacy, users, "users");
    copied.auth_sessions = copyTable(legacy, users, "auth_sessions");
  }
  if (needListings) {
    for (const t of [
      "field_defs",
      "listings",
      "listing_cells",
      "service_categories",
      "postal_codes",
      "partners",
      "partner_services",
    ]) {
      copied[t] = copyTable(legacy, listings, t);
    }
  }
  if (needMessages) {
    for (const t of [
      "conversations",
      "messages",
      "message_blocks",
      "device_tokens",
      "push_outbox",
    ]) {
      copied[t] = copyTable(legacy, messages, t);
    }
  }

  try {
    legacy.close?.();
  } catch {
    /* ignore */
  }

  const bak = `${legacyPath}.bak`;
  try {
    if (!existsSync(bak)) renameSync(legacyPath, bak);
  } catch {
    /* ignore — másolás sikeres lehet backup nélkül is */
  }

  return { migrated: true, copied, backup: bak };
}
