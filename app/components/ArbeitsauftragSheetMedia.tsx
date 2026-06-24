"use client";

import { formatValue } from "../../lib/machines";
import type { Machine } from "../../lib/types/machine";

type Props = {
  machine: Machine;
};

/** Arbeitsauftrag-Munkalap: Maschinenbild + QR rechts (rahmenlos, gleiche Größe). */
export default function ArbeitsauftragSheetMedia({ machine }: Props) {
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
          className={`aaSheetMediaItem aaSheetQrSlot machineQrSlot ${machine.qr_code ? "hasQrImage" : ""}`}
        >
          {machine.qr_code ? (
            <img
              className="machineQrImage aaSheetQrImage"
              src={machine.qr_code}
              alt={`QR Code ${formatValue(machine.geraetenummer)}`}
            />
          ) : (
            <span className="aaSheetMediaPlaceholder">QR Code</span>
          )}
        </div>
      </div>
    </div>
  );
}
