import sharp from "sharp";

/** Einheitliches Maschinenbild: quadratisch, contain, weißer Hintergrund (passt zur UI). */
export const MACHINE_IMAGE_SIZE = 512;
const MACHINE_IMAGE_BG = { r: 255, g: 255, b: 255, alpha: 1 };

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
