/** Fő kép letöltés hasznaltauto hirdetésről → public/uploads/listings/ */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = join(__dirname, "..", "public", "uploads", "listings");

export function listingImageDir() {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
}

export function listingImagePublicPath(fileName) {
  return `/uploads/listings/${fileName}`;
}

export async function extractMainImageUrl(page) {
  return page.evaluate(() => {
    const og = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
    if (og && /^https?:\/\//i.test(og)) return og;

    const selectors = [
      ".swiper-slide-active img",
      ".swiper-slide img",
      "[class*='gallery'] img",
      "[class*='Gallery'] img",
      "[class*='kepek'] img",
      "[class*='foto'] img",
      "img[src*='hasznaltauto']",
      "img[data-src*='hasznaltauto']",
    ];
    for (const sel of selectors) {
      const img = document.querySelector(sel);
      const src = img?.currentSrc || img?.src || img?.getAttribute("data-src");
      if (src && /^https?:\/\//i.test(src) && !/logo|sprite|icon|pixel/i.test(src)) {
        return src;
      }
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
