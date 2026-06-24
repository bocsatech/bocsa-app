import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";
import {
  formatGeraetenummerForQr,
  isStructuredGeraetenummer,
} from "./geraetenummer.ts";

const QR_PUBLIC_DIR = "/qr-codes";
const QR_OUTPUT_DIR = path.join(process.cwd(), "public", "qr-codes");
const STORAGE_BUCKET = "machine-files";
const STORAGE_PREFIX = "qr-codes";

const QR_SIZE = 360;
const LABEL_COLOR = "#f97316";
const HORIZONTAL_PADDING = 16;
const LABEL_GAP = 10;

function safeFilePart(value) {
  return String(value || "maschine")
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function formatLabelText(value) {
  const text = String(value || "").trim();
  return text || "—";
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function qrLabelFontSize(text) {
  const len = text.length;
  if (len <= 8) return 24;
  if (len <= 12) return 20;
  if (len <= 16) return 16;
  if (len <= 20) return 14;
  return 12;
}

async function buildQrWithLabelBelow(qrBuffer, label) {
  const text = formatLabelText(label);
  const fontSize = qrLabelFontSize(text);
  const labelHeight = fontSize + 24;
  const totalWidth = QR_SIZE + HORIZONTAL_PADDING * 2;
  const totalHeight = HORIZONTAL_PADDING + QR_SIZE + LABEL_GAP + labelHeight + HORIZONTAL_PADDING;

  const labelSvg = Buffer.from(`<svg width="${totalWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
    <text x="50%" y="${Math.round(labelHeight * 0.62)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${fontSize}" fill="${LABEL_COLOR}">${escapeXml(text)}</text>
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
      { input: labelSvg, top: HORIZONTAL_PADDING + QR_SIZE + LABEL_GAP, left: 0 },
    ])
    .png()
    .toBuffer();
}

export async function buildPlainQrBuffer(targetUrl) {
  return QRCode.toBuffer(targetUrl, {
    errorCorrectionLevel: "M",
    type: "png",
    width: QR_SIZE,
    margin: 1,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });
}

export async function buildLabeledQrBuffer(targetUrl, label) {
  const qrBuffer = await buildPlainQrBuffer(targetUrl);
  return buildQrWithLabelBelow(qrBuffer, label);
}

async function uploadQrToStorage(supabase, buffer, filename) {
  const storagePath = `${STORAGE_PREFIX}/${filename}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType: "image/png",
    upsert: true,
  });

  if (error) {
    throw new Error(`QR-Upload fehlgeschlagen: ${error.message}`);
  }

  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

async function saveQrLocally(buffer, filename) {
  await mkdir(QR_OUTPUT_DIR, { recursive: true });
  const filePath = path.join(QR_OUTPUT_DIR, filename);
  await writeFile(filePath, buffer);
  return `${QR_PUBLIC_DIR}/${filename}`;
}

export function getMachineQrTargetUrl(machineId, origin) {
  const baseUrl =
    origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://bocsa-app-bocsarobert-3405s-projects.vercel.app";
  return `${baseUrl.replace(/\/$/, "")}/maschinen/${machineId}`;
}

export function resolveMachineQrLabel(machine, options = {}) {
  const requireStructured = options.requireStructured !== false;
  const rawNumber = machine?.geraetenummer ?? null;

  if (requireStructured && !isStructuredGeraetenummer(rawNumber)) {
    return formatLabelText(rawNumber || machine?.id);
  }

  const geraetenummer = requireStructured
    ? formatGeraetenummerForQr(rawNumber)
    : formatLabelText(rawNumber || machine?.id);

  return geraetenummer || formatLabelText(machine?.id);
}

export async function buildMachineQrPngBuffer(machine, origin, options = {}) {
  const machineId = machine?.id;
  if (!machineId) {
    throw new Error("Machine ID fehlt fuer QR-Code.");
  }

  const requireStructured = options.requireStructured !== false;
  const rawNumber = machine.geraetenummer ?? null;

  if (requireStructured && !isStructuredGeraetenummer(rawNumber)) {
    throw new Error(
      "QR-Code nur für Gerätenummer im Format MARKE-KLASSE-ART-00001 (z. B. WN-GG-ST1-00001)."
    );
  }

  const label = resolveMachineQrLabel(machine, { requireStructured });
  if (!label || label === "—") {
    throw new Error("Gerätenummer fehlt für QR-Code.");
  }

  const targetUrl = getMachineQrTargetUrl(machineId, origin);
  if (options.plain) {
    return buildPlainQrBuffer(targetUrl);
  }

  const qrBuffer = await buildPlainQrBuffer(targetUrl);
  return buildQrWithLabelBelow(qrBuffer, label);
}

export async function generateMachineQrCode(machine, origin, options = {}) {
  const machineId = machine?.id;
  if (!machineId) {
    throw new Error("Machine ID fehlt fuer QR-Code.");
  }

  const requireStructured = options.requireStructured !== false;
  const rawNumber = machine.geraetenummer ?? null;

  if (requireStructured && !isStructuredGeraetenummer(rawNumber)) {
    throw new Error(
      "QR-Code nur für Gerätenummer im Format MARKE-KLASSE-ART-00001 (z. B. WN-GG-ST1-00001)."
    );
  }

  const geraetenummer = resolveMachineQrLabel(machine, { requireStructured });
  if (!geraetenummer || geraetenummer === "—") {
    throw new Error("Gerätenummer fehlt für QR-Code.");
  }

  const filename = `${safeFilePart(geraetenummer)}_${safeFilePart(machineId)}.png`;
  const labeledBuffer = await buildMachineQrPngBuffer(machine, origin, options);

  const supabase = options.supabase ?? null;
  if (supabase) {
    const publicPath = await uploadQrToStorage(supabase, labeledBuffer, filename);
    return {
      publicPath,
      targetUrl: getMachineQrTargetUrl(machineId, origin),
      label: geraetenummer,
    };
  }

  const publicPath = await saveQrLocally(labeledBuffer, filename);
  return {
    publicPath,
    targetUrl: getMachineQrTargetUrl(machineId, origin),
    label: geraetenummer,
  };
}
