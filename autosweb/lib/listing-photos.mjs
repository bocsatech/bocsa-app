import { mkdirSync, writeFileSync, existsSync, rmSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { getListing, saveListing } from "./db.mjs";
import { resolveDataDir } from "./db-registry.mjs";

export function listingPhotosDir() {
  return join(resolveDataDir(), "listing-photos");
}

/** @deprecated Használd listingPhotosDir() — a data dir futásidőben változhat. */
export const LISTING_PHOTOS_DIR = listingPhotosDir();

export const LISTING_PHOTO_RULES = {
  maxCount: 12,
  maxBytes: 5 * 1024 * 1024,
};

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function listingDir(listingId) {
  return join(listingPhotosDir(), String(listingId));
}

function decodePhotoPayload(raw) {
  const text = String(raw ?? "");
  const b64 = text.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
  if (!b64) return null;
  const buf = Buffer.from(b64, "base64");
  if (!buf.length) return null;
  return buf;
}

function looksLikeJpeg(buf) {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

function looksLikePng(buf) {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
}

/**
 * Mentés: base64 JPEG/PNG lista → fájlok + fo_kep / kepek mezők.
 * Az első kép a főkép. Max 12, max 5 MB / kép.
 */
export function saveListingPhotos(listingId, photos = []) {
  const id = Number(listingId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Érvénytelen hirdetés azonosító.");
  }
  const listing = getListing(id);
  if (!listing) {
    throw new Error("Nincs ilyen hirdetés.");
  }

  const list = Array.isArray(photos) ? photos.slice(0, LISTING_PHOTO_RULES.maxCount) : [];
  const dir = listingDir(id);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }

  if (list.length === 0) {
    const form = { ...(listing.form ?? {}) };
    delete form.fo_kep;
    delete form.kepek;
    return saveListing(form, id, {
      status: listing.status,
      userId: listing.user_id ?? null,
    });
  }

  ensureDir(dir);
  const urls = [];
  list.forEach((raw, index) => {
    const buf = decodePhotoPayload(raw);
    if (!buf) {
      throw new Error(`Érvénytelen kép (#${index + 1}).`);
    }
    if (buf.length > LISTING_PHOTO_RULES.maxBytes) {
      throw new Error(`A kép maximum 5 MB lehet (#${index + 1}).`);
    }
    let ext = "jpg";
    if (looksLikePng(buf)) ext = "png";
    else if (!looksLikeJpeg(buf)) {
      // HEIC/egyéb → elutasítjuk; a mobil JPEG-et küld.
      throw new Error(`Csak JPEG vagy PNG fogadható (#${index + 1}).`);
    }
    const name = `${String(index + 1).padStart(2, "0")}.${ext}`;
    writeFileSync(join(dir, name), buf);
    urls.push(`/uploads/listings/${id}/${name}`);
  });

  const form = {
    ...(listing.form ?? {}),
    fo_kep: urls[0],
    kepek: JSON.stringify(urls),
  };
  return saveListing(form, id, {
    status: listing.status,
    userId: listing.user_id ?? null,
  });
}

/** GET /uploads/listings/:id/:file */
export function resolveListingPhotoFile(pathname) {
  const match = String(pathname ?? "").match(/^\/uploads\/listings\/(\d+)\/([a-zA-Z0-9._-]+)$/);
  if (!match) return null;
  const id = match[1];
  const file = match[2];
  const abs = join(listingDir(id), file);
  if (!abs.startsWith(listingDir(id)) || !existsSync(abs)) return null;
  return abs;
}

export function readListingPhoto(absPath) {
  return readFileSync(absPath);
}

export function listListingPhotoFiles(listingId) {
  const dir = listingDir(listingId);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => /\.(jpe?g|png)$/i.test(name))
    .sort()
    .map((name) => `/uploads/listings/${listingId}/${name}`);
}
