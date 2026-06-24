export function getMachineQrImageUrl(machineId: string) {
  return `/api/machines/${encodeURIComponent(machineId)}/qr`;
}
