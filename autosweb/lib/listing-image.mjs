/** Fő kép letöltés — tartós mappa: ~/.autosweb/uploads/listings/ (túléli a frissítést). */

import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEGACY_UPLOAD_DIR = join(__dirname, "..", "public", "uploads", "listings");

function stableUploadDir() {
  if (process.env.AUTOSWEB_UPLOADS_PATH) return process.env.AUTOSWEB_UPLOADS_PATH;
  return join(homedir(), ".autosweb", "uploads", "listings");
}

let migratedLegacy = false;

function migrateLegacyUploadsIfNeeded(destDir) {
  if (migratedLegacy) return;
  migratedLegacy = true;
  if (!existsSync(LEGACY_UPLOAD_DIR)) return;
  try {
    for (const name of readdirSync(LEGACY_UPLOAD_DIR)) {
      if (name.startsWith(".")) continue;
      const from = join(LEGACY_UPLOAD_DIR, name);
      const to = join(destDir, name);
      if (!existsSync(to)) {
        try {
          copyFileSync(from, to);
        } catch {
          /* ignore single file */
        }
      }
    }
  } catch {
    /* ignore */
  }
}

export function listingImageDir() {
  const dir = stableUploadDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  migrateLegacyUploadsIfNeeded(dir);
  return dir;
}

export function listingImagePublicPath(fileName) {
  return `/uploads/listings/${fileName}`;
}

/** Abszolút fájlútvonal a /uploads/listings/… URL-hez, vagy null. */
export function resolveListingImageFile(urlPath) {
  const rel = String(urlPath || "").replace(/^\/+/, "");
  if (!rel.startsWith("uploads/listings/")) return null;
  const name = rel.slice("uploads/listings/".length);
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return null;
  const primary = join(listingImageDir(), name);
  if (existsSync(primary)) return primary;
  const legacy = join(LEGACY_UPLOAD_DIR, name);
  if (existsSync(legacy)) return legacy;
  return null;
}

/** True ha nincs fo_kep, vagy helyi fájl hiányzik. Távoli https URL = OK. */
export function isListingImageMissing(foKep) {
  const path = String(foKep || "").trim();
  if (!path) return true;
  if (/^https?:\/\//i.test(path)) return false;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return !resolveListingImageFile(normalized);
}

export async function extractMainImageUrl(page) {
  return page.evaluate(() => {
    const pick = (src) => {
      if (!src || !/^https?:\/\//i.test(src)) return null;
      if (/logo|sprite|icon|pixel|avatar|badge|placeholder/i.test(src)) return null;
      return src;
    };

    const og = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
    if (pick(og)) return pick(og);

    const twitter = document.querySelector('meta[name="twitter:image"]')?.getAttribute("content");
    if (pick(twitter)) return pick(twitter);

    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(script.textContent || "");
        const nodes = Array.isArray(data) ? data : [data];
        for (const node of nodes) {
          const img = node?.image;
          const candidate = Array.isArray(img) ? img[0] : typeof img === "string" ? img : img?.url;
          if (pick(candidate)) return pick(candidate);
        }
      } catch {
        /* ignore */
      }
    }

    const selectors = [
      ".swiper-slide-active img",
      ".swiper-slide img",
      "[class*='gallery'] img",
      "[class*='Gallery'] img",
      "[class*='kepek'] img",
      "[class*='foto'] img",
      "[class*='photo'] img",
      "picture source",
      "img[src*='hasznaltauto']",
      "img[data-src*='hasznaltauto']",
      "img[srcset*='hasznaltauto']",
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      if (el.tagName === "SOURCE") {
        const srcset = el.getAttribute("srcset") || "";
        const first = srcset.split(",")[0]?.trim().split(/\s+/)[0];
        if (pick(first)) return pick(first);
      }
      const src =
        el.currentSrc ||
        el.src ||
        el.getAttribute("data-src") ||
        el.getAttribute("data-lazy") ||
        (el.getAttribute("srcset") || "").split(",")[0]?.trim().split(/\s+/)[0];
      if (pick(src)) return pick(src);
    }
    return null;
  });
}

function extFromUrl(url) {
  const path = String(url).split("?")[0];
  const m = path.match(/\.(jpe?g|png|webp)$/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

/**
 * Letölti a fő képet. Vissza: publikus útvonal vagy null.
 * @param {import('playwright').Page} page
 * @param {string} imageUrl
 * @param {string} listingKey — pl. hasznaltauto id
 */
export async function downloadMainImage(page, imageUrl, listingKey) {
  if (!imageUrl || !listingKey) return null;
  const safeKey = String(listingKey).replace(/[^\w.-]+/g, "_").slice(0, 64);
  if (!safeKey) return null;

  const ext = extFromUrl(imageUrl);
  const fileName = `${safeKey}.${ext}`;
  const dest = join(listingImageDir(), fileName);

  try {
    const response = await page.context().request.get(imageUrl, {
      timeout: 30000,
      headers: { Referer: "https://www.hasznaltauto.hu/" },
    });
    if (!response.ok()) return null;
    const buffer = Buffer.from(await response.body());
    if (buffer.length < 500) return null;
    writeFileSync(dest, buffer);
    return listingImagePublicPath(fileName);
  } catch {
    return null;
  }
}
