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
const LABEL_BG = "#ffffff";

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

async function buildLabeledQrBuffer(targetUrl, label) {
  const qrOptions = {
    errorCorrectionLevel: "H",
    type: "png",
    width: QR_SIZE,
    margin: 2,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  };

  const qrBuffer = await QRCode.toBuffer(targetUrl, qrOptions);
  return overlayLabelOnQr(qrBuffer, label);
}

function qrLabelFontSize(text) {
  const len = text.length;
  if (len <= 8) return 28;
  if (len <= 12) return 22;
  if (len <= 16) return 18;
  if (len <= 20) return 15;
  return 13;
}

async function overlayLabelOnQr(qrBuffer, label) {
  const text = formatLabelText(label);
  const fontSize = qrLabelFontSize(text);
  const paddingX = Math.round(fontSize * 0.55);
  const paddingY = Math.round(fontSize * 0.35);
  const boxWidth = Math.min(
    QR_SIZE - 24,
    Math.max(Math.round(text.length * fontSize * 0.62) + paddingX * 2, 72)
  );
  const boxHeight = fontSize + paddingY * 2;
  const left = Math.round((QR_SIZE - boxWidth) / 2);
  const top = Math.round((QR_SIZE - boxHeight) / 2);

  const labelSvg = Buffer.from(`
    <svg width="${boxWidth}" height="${boxHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" rx="6" ry="6" fill="${LABEL_BG}"/>
      <text
        x="50%"
        y="54%"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="${LABEL_COLOR}"
        font-family="Arial, Helvetica, sans-serif"
        font-weight="800"
        font-size="${fontSize}px"
      >${escapeXml(text)}</text>
    </svg>
  `);

  return sharp(qrBuffer)
    .composite([
      {
        input: labelSvg,
        top,
        left,
      },
    ])
    .png()
    .toBuffer();
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

  const geraetenummer = requireStructured
    ? formatGeraetenummerForQr(rawNumber)
    : formatLabelText(rawNumber || machineId);

  if (!geraetenummer) {
    throw new Error("Gerätenummer fehlt für QR-Code.");
  }

  const filename = `${safeFilePart(geraetenummer)}_${safeFilePart(machineId)}.png`;
  const targetUrl = getMachineQrTargetUrl(machineId, origin);
  const labeledBuffer = await buildLabeledQrBuffer(targetUrl, geraetenummer);

  const supabase = options.supabase ?? null;
  if (supabase) {
    const publicPath = await uploadQrToStorage(supabase, labeledBuffer, filename);
    return {
      publicPath,
      targetUrl,
      label: geraetenummer,
    };
  }

  const publicPath = await saveQrLocally(labeledBuffer, filename);
  return {
    publicPath,
    targetUrl,
    label: geraetenummer,
  };
}
