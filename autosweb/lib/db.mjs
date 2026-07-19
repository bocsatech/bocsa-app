import { mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";
import { FORM_FIELD_CATALOG } from "./form-field-catalog.mjs";
import { formDataToCells, cellsToFormData } from "./form-field-catalog.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

function resolveDbPath() {
  return process.env.AUTOSWEB_DB_PATH || join(DATA_DIR, "autosweb.db");
}

let dbInstance = null;
let dbInstancePath = null;

function getDb() {
  const dbPath = resolveDbPath();
  if (dbInstance && dbInstancePath === dbPath) return dbInstance;
  const dir = dirname(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  dbInstance = new DatabaseSync(dbPath);
  dbInstancePath = dbPath;
  dbInstance.exec("PRAGMA foreign_keys = ON;");
  initSchema(dbInstance);
  return dbInstance;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS field_defs (
      field_key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      step INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hirdetes_cime TEXT,
      forras_url TEXT,
      hasznaltauto_hirdetes_id TEXT,
      status TEXT NOT NULL DEFAULT 'mentett',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS listing_cells (
      listing_id INTEGER NOT NULL,
      field_key TEXT NOT NULL,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      step INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (listing_id, field_key),
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_listing_cells_listing ON listing_cells(listing_id);
    CREATE INDEX IF NOT EXISTS idx_listings_updated ON listings(updated_at DESC);
  `);

  const insertDef = db.prepare(`
    INSERT OR IGNORE INTO field_defs (field_key, label, step, sort_order)
    VALUES (?, ?, ?, ?)
  `);
  FORM_FIELD_CATALOG.forEach((def, index) => {
    insertDef.run(def.field_key, def.label, def.step, index);
  });

  migrateListingsStatus(db);
}

function migrateListingsStatus(db) {
  const columns = db.prepare("PRAGMA table_info(listings)").all();
  if (!columns.some((col) => col.name === "status")) {
    db.exec("ALTER TABLE listings ADD COLUMN status TEXT NOT NULL DEFAULT 'mentett'");
  }
}

export const LISTING_STATUSES = ["mentett", "feladott"];

export function normalizeListingStatus(status) {
  const value = String(status ?? "mentett").trim().toLowerCase();
  return LISTING_STATUSES.includes(value) ? value : "mentett";
}

export function getDbPath() {
  getDb();
  return resolveDbPath();
}

export function listFieldDefs() {
  const db = getDb();
  return db.prepare("SELECT field_key, label, step FROM field_defs ORDER BY sort_order").all();
}

export function listListings({ limit = 50, status = null } = {}) {
  const db = getDb();
  const normalizedStatus = status ? normalizeListingStatus(status) : null;
  if (normalizedStatus) {
    return db
      .prepare(
        `SELECT l.id, l.hirdetes_cime, l.forras_url, l.hasznaltauto_hirdetes_id, l.status,
                l.created_at, l.updated_at,
                (SELECT COUNT(*) FROM listing_cells c WHERE c.listing_id = l.id) AS cell_count
         FROM listings l WHERE l.status = ? ORDER BY l.updated_at DESC LIMIT ?`
      )
      .all(normalizedStatus, limit);
  }
  return db
    .prepare(
      `SELECT l.id, l.hirdetes_cime, l.forras_url, l.hasznaltauto_hirdetes_id, l.status,
              l.created_at, l.updated_at,
              (SELECT COUNT(*) FROM listing_cells c WHERE c.listing_id = l.id) AS cell_count
       FROM listings l ORDER BY l.updated_at DESC LIMIT ?`
    )
    .all(limit);
}

export function getListing(id) {
  const db = getDb();
  const listing = db
    .prepare(
      `SELECT id, hirdetes_cime, forras_url, hasznaltauto_hirdetes_id, status, created_at, updated_at
       FROM listings WHERE id = ?`
    )
    .get(id);
  if (!listing) return null;

  const cells = db
    .prepare(
      `SELECT field_key, label, value, step FROM listing_cells
       WHERE listing_id = ? ORDER BY step, label`
    )
    .all(id);

  return {
    ...listing,
    cells,
    form: cellsToFormData(cells),
  };
}

export function getLatestListing() {
  const db = getDb();
  const row = db.prepare("SELECT id FROM listings ORDER BY updated_at DESC LIMIT 1").get();
  return row ? getListing(row.id) : null;
}

export function findListingBySourceUrl(url) {
  if (!url) return null;
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM listings WHERE forras_url = ? ORDER BY updated_at DESC LIMIT 1")
    .get(url);
  return row ? getListing(row.id) : null;
}

function upsertListingMeta(db, id, formData, status) {
  db.prepare(
    `UPDATE listings SET
      hirdetes_cime = ?,
      forras_url = ?,
      hasznaltauto_hirdetes_id = ?,
      status = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    formData.hirdetes_cime ?? "",
    formData.forras_url ?? "",
    formData.hasznaltauto_hirdetes_id ?? "",
    normalizeListingStatus(status ?? formData.status),
    id
  );
}

function replaceCells(db, listingId, cells) {
  db.prepare("DELETE FROM listing_cells WHERE listing_id = ?").run(listingId);
  const insert = db.prepare(
    `INSERT INTO listing_cells (listing_id, field_key, label, value, step)
     VALUES (?, ?, ?, ?, ?)`
  );
  for (const cell of cells) {
    insert.run(listingId, cell.field_key, cell.label, cell.value, cell.step ?? 1);
  }
}

export function saveListing(formData, listingId = null, { status = null } = {}) {
  const db = getDb();
  const cells = formDataToCells(formData);
  const listingStatus = normalizeListingStatus(status ?? formData.status);

  if (listingId) {
    const existing = db.prepare("SELECT id FROM listings WHERE id = ?").get(listingId);
    if (!existing) return null;
    upsertListingMeta(db, listingId, formData, listingStatus);
    replaceCells(db, listingId, cells);
    return getListing(listingId);
  }

  const insert = db.prepare(
    `INSERT INTO listings (hirdetes_cime, forras_url, hasznaltauto_hirdetes_id, status)
     VALUES (?, ?, ?, ?)`
  );
  const result = insert.run(
    formData.hirdetes_cime ?? "",
    formData.forras_url ?? "",
    formData.hasznaltauto_hirdetes_id ?? "",
    listingStatus
  );
  const id = Number(result.lastInsertRowid);
  replaceCells(db, id, cells);
  return getListing(id);
}

export function deleteListing(id) {
  const db = getDb();
  db.prepare("DELETE FROM listings WHERE id = ?").run(id);
  return { ok: true };
}

export function dbStats() {
  const db = getDb();
  const listings = db.prepare("SELECT COUNT(*) AS n FROM listings").get().n;
  const cells = db.prepare("SELECT COUNT(*) AS n FROM listing_cells").get().n;
  const mentett = db.prepare("SELECT COUNT(*) AS n FROM listings WHERE status = 'mentett'").get().n;
  const feladott = db.prepare("SELECT COUNT(*) AS n FROM listings WHERE status = 'feladott'").get().n;
  return { listings, cells, mentett, feladott, path: resolveDbPath() };
}

export { formDataToCells, cellsToFormData };
