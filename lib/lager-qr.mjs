import QRCode from "qrcode";
import sharp from "sharp";

const QR_SIZE = 360;
const LABEL_HEIGHT = 52;
const HORIZONTAL_PADDING = 20;
const GAP = 8;
const LABEL_COLOR = "#111827";

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function labelFontSize(text) {
  const len = text.length;
  if (len <= 8) return 24;
  if (len <= 12) return 20;
  if (len <= 16) return 16;
  if (len <= 20) return 14;
  return 12;
}

export function getLagerQrPayload(herstellernummer) {
  return String(herstellernummer ?? "").trim();
}

export async function buildLagerTeilQrPng(herstellernummer) {
  const payload = getLagerQrPayload(herstellernummer);
  if (!payload) {
    throw new Error("Herstellernummer fehlt für QR-Code.");
  }

  const qrBuffer = await QRCode.toBuffer(payload, {
    errorCorrectionLevel: "M",
    type: "png",
    width: QR_SIZE,
    margin: 1,
    color: { dark: "#111827", light: "#ffffff" },
  });

  const fontSize = labelFontSize(payload);
  const totalWidth = QR_SIZE + HORIZONTAL_PADDING * 2;
  const totalHeight = HORIZONTAL_PADDING + QR_SIZE + GAP + LABEL_HEIGHT + HORIZONTAL_PADDING;

  const labelSvg = Buffer.from(`<svg width="${totalWidth}" height="${LABEL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <text x="50%" y="34" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${fontSize}" fill="${LABEL_COLOR}">${escapeXml(payload)}</text>
  </svg>`);

  return sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      { input: qrBuffer, top: HORIZONTAL_PADDING, left: HORIZONTAL_PADDING },
      { input: labelSvg, top: HORIZONTAL_PADDING + QR_SIZE + GAP, left: 0 },
    ])
    .png()
    .toBuffer();
}
