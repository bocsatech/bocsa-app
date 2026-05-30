import sharp from "sharp";

/** Einheitliches Maschinenbild: quadratisch, zugeschnitten (cover), ohne Letterbox. */
export const MACHINE_IMAGE_SIZE = 512;

/**
 * Entfernt eingebettete Letterbox-Ränder (z. B. alte graue/weiße Balken) und
 * normalisiert auf 512×512 mit cover.
 *
 * @param {Buffer} buffer — Original-Upload oder bestehendes WEBP
 * @returns {Promise<Buffer>} WEBP, 512×512
 */
export async function normalizeMachineImage(buffer) {
  let working = sharp(buffer).rotate();

  try {
    const trimmed = await working.clone().trim({ threshold: 14 }).toBuffer();
    working = sharp(trimmed);
  } catch {
    // Kein trimmbarer Rand — Original weiterverwenden
  }

  return working
    .resize(MACHINE_IMAGE_SIZE, MACHINE_IMAGE_SIZE, {
      fit: "cover",
      position: "centre",
    })
    .webp({ quality: 85 })
    .toBuffer();
}
