"use client";

import { formatValue } from "../../lib/machines";
import { getMachineQrImageUrl } from "../../lib/machine-qr-display";
import type { Machine } from "../../lib/types/machine";

type Props = {
  machine: Machine;
};

/** Arbeitsauftrag-Munkalap: Maschinenbild + QR rechts (rahmenlos, gleiche Größe). */
export default function ArbeitsauftragSheetMedia({ machine }: Props) {
  const qrSrc = machine.id ? getMachineQrImageUrl(machine.id) : machine.qr_code ?? null;
  const qrLabel = formatValue(machine.geraetenummer);

  return (
    <div className="aaSheetImageCol">
      <div className="aaSheetMediaStack">
        <div
          className={`aaSheetMediaItem machineImageSlot ${machine.image ? "hasMachineImage" : ""}`}
        >
          {machine.image ? (
            <img className="machineImagePreview" src={machine.image} alt="Maschinenbild" />
          ) : (
            <span className="aaSheetMediaPlaceholder">Maschinenbild</span>
          )}
        </div>
        <div
          className={`aaSheetMediaItem aaSheetQrSlot machineQrSlot ${qrSrc ? "hasQrImage machineQrLabeled" : ""}`}
        >
          {qrSrc ? (
            <>
              <img
                className="machineQrImage aaSheetQrImage"
                src={qrSrc}
                alt={`QR Code ${qrLabel}`}
              />
              {qrLabel ? <p className="machineQrCaption">{qrLabel}</p> : null}
            </>
          ) : (
            <span className="aaSheetMediaPlaceholder">QR Code</span>
          )}
        </div>
      </div>
    </div>
  );
}
