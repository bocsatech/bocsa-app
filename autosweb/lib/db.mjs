import { formDataToCells, cellsToFormData, FORM_FIELD_CATALOG } from "./form-field-catalog.mjs";
import {
  buildPreviewFromCells,
  sanitizeListingFieldValue,
  sanitizeListingPlainText,
} from "./listing-preview.mjs";
import { initPartnerSchema } from "./partner-schema.mjs";
import { getListingsDb, getListingsDbPath, getDbPaths, getUsersDb } from "./db-registry.mjs";

/** Hirdetések DB (listings.db) — séma init path szerint. */
let listingsSchemaPath = null;

function getDb() {
  const db = getListingsDb();
  const path = getListingsDbPath();
  if (listingsSchemaPath !== path) {
    initSchema(db);
    listingsSchemaPath = path;
  }
  return db;
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
      user_id INTEGER,
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
  migrateListingsUserId(db);
  initPartnerSchema(db);
}

function migrateListingsStatus(db) {
  const columns = db.prepare("PRAGMA table_info(listings)").all();
  if (!columns.some((col) => col.name === "status")) {
    db.exec("ALTER TABLE listings ADD COLUMN status TEXT NOT NULL DEFAULT 'mentett'");
  }
}

function migrateListingsUserId(db) {
  const columns = db.prepare("PRAGMA table_info(listings)").all();
  if (!columns.some((col) => col.name === "user_id")) {
    db.exec("ALTER TABLE listings ADD COLUMN user_id INTEGER");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_listings_user ON listings(user_id)");
}

export const LISTING_STATUSES = ["mentett", "feladott", "inaktiv"];

export function normalizeListingStatus(status) {
  const value = String(status ?? "mentett").trim().toLowerCase();
  return LISTING_STATUSES.includes(value) ? value : "mentett";
}

export function getDbPath() {
  getDb();
  return getListingsDbPath();
}

export { getDb, getListingsDb, getDbPaths };

export function listFieldDefs() {
  const db = getDb();
  return db.prepare("SELECT field_key, label, step FROM field_defs ORDER BY sort_order").all();
}

const LISTING_ROW_SQL = `l.id, l.hirdetes_cime, l.forras_url, l.hasznaltauto_hirdetes_id, l.status,
                l.user_id, l.created_at, l.updated_at,
                (SELECT COUNT(*) FROM listing_cells c WHERE c.listing_id = l.id) AS cell_count`;

export function listListings({ limit = 50, status = null, userId = null, excludeInactive = false } = {}) {
  const db = getDb();
  const normalizedStatus = status ? normalizeListingStatus(status) : null;
  const uid = userId != null && Number.isFinite(Number(userId)) ? Number(userId) : null;

  if (uid != null && normalizedStatus) {
    return db
      .prepare(
        `SELECT ${LISTING_ROW_SQL}
         FROM listings l WHERE l.user_id = ? AND l.status = ?
         ORDER BY l.updated_at DESC LIMIT ?`
      )
      .all(uid, normalizedStatus, limit);
  }
  if (uid != null) {
    return db
      .prepare(
        `SELECT ${LISTING_ROW_SQL}
         FROM listings l WHERE l.user_id = ?
         ORDER BY l.updated_at DESC LIMIT ?`
      )
      .all(uid, limit);
  }
  if (normalizedStatus) {
    return db
      .prepare(
        `SELECT ${LISTING_ROW_SQL}
         FROM listings l WHERE l.status = ? ORDER BY l.updated_at DESC LIMIT ?`
      )
      .all(normalizedStatus, limit);
  }
  if (excludeInactive) {
    return db
      .prepare(
        `SELECT ${LISTING_ROW_SQL}
         FROM listings l WHERE l.status != 'inaktiv'
         ORDER BY l.updated_at DESC LIMIT ?`
      )
      .all(limit);
  }
  return db
    .prepare(
      `SELECT ${LISTING_ROW_SQL}
       FROM listings l ORDER BY l.updated_at DESC LIMIT ?`
    )
    .all(limit);
}

function loadCellsByListingIds(ids) {
  if (!ids.length) return new Map();
  const db = getDb();
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT listing_id, field_key, label, value, step
       FROM listing_cells WHERE listing_id IN (${placeholders})`
    )
    .all(...ids);
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.listing_id)) map.set(row.listing_id, []);
    map.get(row.listing_id).push(row);
  }
  return map;
}

export function listListingsWithPreview({
  limit = 50,
  status = null,
  userId = null,
  excludeInactive = false,
} = {}) {
  const rows = listListings({ limit, status, userId, excludeInactive });
  const cellsById = loadCellsByListingIds(rows.map((row) => row.id));
  return rows.map((row) => {
    const cells = (cellsById.get(row.id) ?? []).map((cell) => sanitizeListingCell(cell));
    const hirdetes_cime =
      sanitizeListingPlainText(row.hirdetes_cime) || `Hirdetés #${row.id}`;
    const preview = buildPreviewFromCells(cells, { ...row, hirdetes_cime });
    return {
      ...row,
      hirdetes_cime,
      user_id: row.user_id ?? null,
      fo_kep: preview.imageUrl || null,
      preview,
    };
  });
}

/**
 * Saját hirdetések: user_id egyezés + orphan visszaigénylés.
 * - email mező egyezés (ha a feladáskor mentve volt)
 * - helyi Autosweb: ha csak 1 felhasználó van, a tulajdonos nélküli feladott hirdetések az övéi
 */
export function listMyListingsWithPreview(user, { limit = 100, claimOrphans = true } = {}) {
  const uid = Number(user?.id);
  const email = String(user?.email ?? "")
    .trim()
    .toLowerCase();
  if (!Number.isFinite(uid) || uid <= 0) return [];

  const byId = new Map();
  for (const row of listListingsWithPreview({ limit, userId: uid })) {
    byId.set(row.id, row);
  }

  let soleUser = false;
  try {
    const n = getUsersDb().prepare("SELECT COUNT(*) AS n FROM users").get()?.n ?? 0;
    soleUser = Number(n) === 1;
  } catch {
    soleUser = false;
  }

  const candidates = listListingsWithPreview({ limit: Math.max(limit, 200) });
  for (const row of candidates) {
    if (byId.has(row.id)) continue;
    if (row.user_id != null && Number(row.user_id) !== uid) continue;

    const listing = getListing(row.id);
    const formEmail = String(listing?.form?.email ?? "")
      .trim()
      .toLowerCase();
    const emailMatch = Boolean(email && formEmail && formEmail === email);
    const soleOrphan =
      soleUser && (row.user_id == null || row.user_id === "") && row.status === "feladott";

    if (!emailMatch && !soleOrphan) continue;

    if (claimOrphans && (listing.user_id == null || listing.user_id === "")) {
      getDb()
        .prepare("UPDATE listings SET user_id = ?, updated_at = datetime('now') WHERE id = ?")
        .run(uid, row.id);
    }
    byId.set(row.id, { ...row, user_id: uid });
  }

  return [...byId.values()]
    .sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")))
    .slice(0, limit);
}

export function getListing(id) {
  const db = getDb();
  const listing = db
    .prepare(
      `SELECT id, hirdetes_cime, forras_url, hasznaltauto_hirdetes_id, status, user_id,
              created_at, updated_at
       FROM listings WHERE id = ?`
    )
    .get(id);
  if (!listing) return null;

  const cells = db
    .prepare(
      `SELECT field_key, label, value, step FROM listing_cells
       WHERE listing_id = ? ORDER BY step, label`
    )
    .all(id)
    .map((cell) => sanitizeListingCell(cell));

  const hirdetes_cime =
    sanitizeListingPlainText(listing.hirdetes_cime) || `Hirdetés #${listing.id}`;
  const form = enrichFormContactFromOwner(cellsToFormData(cells), listing.user_id);

  return {
    ...listing,
    hirdetes_cime,
    user_id: listing.user_id ?? null,
    cells,
    form,
    fo_kep: form.fo_kep || null,
  };
}

/** Ha a hirdetésen nincs név/telefon, a tulajdonos profiljából pótoljuk (megjelenítéshez). */
function enrichFormContactFromOwner(form, userId) {
  const out = { ...(form && typeof form === "object" ? form : {}) };
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return out;

  const hasPhone =
    String(out.telefon1_szam ?? "").trim() ||
    String(out.telefon1_korzet ?? "").trim() ||
    String(out.telefonszam ?? "").trim() ||
    String(out.telefon ?? "").trim();
  const hasName = String(out.hirdeto_nev ?? "").trim();
  if (hasPhone && hasName) return out;

  try {
    const row = getUsersDb().prepare("SELECT display_name, profile_json, email FROM users WHERE id = ?").get(uid);
    if (!row) return out;
    let profile = {};
    try {
      profile = JSON.parse(row.profile_json || "{}") || {};
    } catch {
      profile = {};
    }
    if (!hasName) {
      const named =
        String(row.display_name ?? "").trim() ||
        [profile.lastName, profile.firstName].filter(Boolean).join(" ").trim();
      if (named) out.hirdeto_nev = named;
    }
    if (!hasPhone) {
      const phone = String(profile.phone ?? "").trim();
      if (phone) {
        out.telefonszam = phone;
        const parts = splitHuPhone(phone);
        if (parts) {
          out.telefon1_orszag = parts.orszag;
          out.telefon1_korzet = parts.korzet;
          out.telefon1_szam = parts.szam;
        }
      }
    }
  } catch {
    /* users.db hiány / teszt */
  }
  return out;
}

function splitHuPhone(raw) {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  let orszag = "+36";
  if (digits.startsWith("36") && digits.length > 2) digits = digits.slice(2);
  else if (digits.startsWith("06") && digits.length > 2) digits = digits.slice(2);
  if (digits.length < 7) return { orszag, korzet: "", szam: digits };
  const korzet = digits.slice(0, 2);
  const rest = digits.slice(2);
  const szam =
    rest.length > 3 ? `${rest.slice(0, 3)} ${rest.slice(3)}` : rest;
  return { orszag, korzet, szam };
}

const CHROME_FIELD_KEYS = new Set([
  "leiras",
  "hirdetes_cime",
  "gyartmany",
  "modell",
  "tipus",
  "telepules",
  "megye",
  "megtekintesi_cim",
  "iranyitoszam",
]);

function sanitizeListingCell(cell) {
  if (!cell) return cell;
  const key = String(cell.field_key ?? "");
  if (key === "leiras" || key === "hirdetes_cime") {
    return { ...cell, value: sanitizeListingPlainText(cell.value) };
  }
  // Scrape: chrome a gyártmány/modell/település/cím mezőkbe is kerülhet
  if (CHROME_FIELD_KEYS.has(key)) {
    return { ...cell, value: sanitizeListingFieldValue(cell.value) };
  }
  return cell;
}

function sanitizeFormDataForSave(formData = {}) {
  const data = { ...formData };
  data.hirdetes_cime = sanitizeListingPlainText(data.hirdetes_cime) || "";
  data.leiras = sanitizeListingPlainText(data.leiras) || "";
  data.gyartmany = sanitizeListingFieldValue(data.gyartmany);
  data.modell = sanitizeListingFieldValue(data.modell);
  data.tipus = sanitizeListingFieldValue(data.tipus);
  data.telepules = sanitizeListingFieldValue(data.telepules);
  data.megye = sanitizeListingFieldValue(data.megye);
  data.megtekintesi_cim = sanitizeListingFieldValue(data.megtekintesi_cim);
  data.iranyitoszam = sanitizeListingFieldValue(data.iranyitoszam);
  return data;
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

function upsertListingMeta(db, id, formData, status, userId = undefined) {
  if (userId !== undefined) {
    db.prepare(
      `UPDATE listings SET
        hirdetes_cime = ?,
        forras_url = ?,
        hasznaltauto_hirdetes_id = ?,
        status = ?,
        user_id = ?,
        updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      formData.hirdetes_cime ?? "",
      formData.forras_url ?? "",
      formData.hasznaltauto_hirdetes_id ?? "",
      normalizeListingStatus(status ?? formData.status),
      userId,
      id
    );
    return;
  }
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

export function saveListing(formData, listingId = null, { status = null, userId = undefined } = {}) {
  const db = getDb();
  const clean = sanitizeFormDataForSave(formData);
  const cells = formDataToCells(clean);
  const listingStatus = normalizeListingStatus(status ?? clean.status);
  const ownerId =
    userId === undefined
      ? undefined
      : userId == null || !Number.isFinite(Number(userId))
        ? null
        : Number(userId);

  if (listingId) {
    const existing = db.prepare("SELECT id FROM listings WHERE id = ?").get(listingId);
    if (!existing) return null;
    upsertListingMeta(db, listingId, clean, listingStatus, ownerId);
    replaceCells(db, listingId, cells);
    return getListing(listingId);
  }

  const insert = db.prepare(
    `INSERT INTO listings (hirdetes_cime, forras_url, hasznaltauto_hirdetes_id, status, user_id)
     VALUES (?, ?, ?, ?, ?)`
  );
  const result = insert.run(
    clean.hirdetes_cime ?? "",
    clean.forras_url ?? "",
    clean.hasznaltauto_hirdetes_id ?? "",
    listingStatus,
    ownerId === undefined ? null : ownerId
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

/** Tulajdonos: aktív (feladott) / inaktív váltás. */
export function setListingStatus(id, status, userId) {
  const db = getDb();
  const listingId = Number(id);
  const uid = Number(userId);
  if (!Number.isFinite(listingId) || listingId <= 0) return null;
  if (!Number.isFinite(uid) || uid <= 0) return null;
  const next = normalizeListingStatus(status);
  if (next !== "feladott" && next !== "inaktiv") {
    const err = new Error("Érvénytelen státusz (feladott vagy inaktiv).");
    err.status = 400;
    throw err;
  }
  const existing = db.prepare("SELECT id, user_id, status FROM listings WHERE id = ?").get(listingId);
  if (!existing) return null;
  if (existing.user_id != null && Number(existing.user_id) !== uid) {
    const err = new Error("Ehhez a hirdetéshez nincs jogosultságod.");
    err.status = 403;
    throw err;
  }
  db.prepare(
    `UPDATE listings SET status = ?, user_id = COALESCE(user_id, ?), updated_at = datetime('now') WHERE id = ?`
  ).run(next, uid, listingId);
  return getListing(listingId);
}

export function dbStats() {
  const db = getDb();
  const listings = db.prepare("SELECT COUNT(*) AS n FROM listings").get().n;
  const cells = db.prepare("SELECT COUNT(*) AS n FROM listing_cells").get().n;
  const mentett = db.prepare("SELECT COUNT(*) AS n FROM listings WHERE status = 'mentett'").get().n;
  const feladott = db.prepare("SELECT COUNT(*) AS n FROM listings WHERE status = 'feladott'").get().n;
  const paths = getDbPaths();
  return {
    listings,
    cells,
    mentett,
    feladott,
    path: paths.listings,
    paths,
  };
}

export { formDataToCells, cellsToFormData };
