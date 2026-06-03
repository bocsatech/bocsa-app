import { buildLabeledQrBuffer } from "./qr-code.mjs";

export function getLagerQrPayload(herstellernummer) {
  return String(herstellernummer ?? "").trim();
}

export async function buildLagerTeilQrPng(herstellernummer) {
  const payload = getLagerQrPayload(herstellernummer);
  if (!payload) {
    throw new Error("Herstellernummer fehlt für QR-Code.");
  }
  return buildLabeledQrBuffer(payload, payload);
}
