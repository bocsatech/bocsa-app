import { formatGeraetenummerForQr, isStructuredGeraetenummer } from "./geraetenummer.ts";
import { generateMachineQrCode } from "./qr-code.mjs";

/**
 * QR erzeugen, in Storage speichern und maschines.qr_code aktualisieren.
 * @returns {Promise<string>} Cache-busted öffentliche URL
 */
export async function persistMachineQrCode(db, machine, origin, options = {}) {
  const requireStructured = options.requireStructured !== false;
  const geraetenummer = machine.geraetenummer ?? machine.machine_tab_data?.geraetenummer;

  if (requireStructured && !isStructuredGeraetenummer(geraetenummer)) {
    throw new Error(
      `QR-Code nur für Gerätenummer im Format MARKE-KLASSE-ART-00001 (z. B. WN-GG-ST1-00001). Aktuell: „${geraetenummer ?? "—"}“.`
    );
  }

  const rowForQr = {
    ...machine,
    geraetenummer: formatGeraetenummerForQr(geraetenummer) || geraetenummer,
  };

  const { publicPath } = await generateMachineQrCode(rowForQr, origin, {
    supabase: db,
    requireStructured,
  });

  const bustUrl = `${publicPath.replace(/\?.*$/, "")}?v=${Date.now()}`;

  const { error: updateError } = await db
    .from("maschines")
    .update({ qr_code: bustUrl })
    .eq("id", machine.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return bustUrl;
}
