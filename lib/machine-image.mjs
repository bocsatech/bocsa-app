import sharp from "sharp";

/** Einheitliches Maschinenbild: quadratisch, contain, heller Hintergrund (#f3f4f6). */
export const MACHINE_IMAGE_SIZE = 512;
const MACHINE_IMAGE_BG = { r: 243, g: 244, b: 246, alpha: 1 };

/**
 * @param {Buffer} buffer — Original-Upload
 * @returns {Promise<Buffer>} WEBP, 512×512
 */
export async function normalizeMachineImage(buffer) {
  return sharp(buffer)
    .rotate()
    .resize(MACHINE_IMAGE_SIZE, MACHINE_IMAGE_SIZE, {
      fit: "contain",
      background: MACHINE_IMAGE_BG,
    })
    .webp({ quality: 85 })
    .toBuffer();
}
