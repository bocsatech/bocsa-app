"use client";

import { formatValue } from "../../lib/machines";
import type { Machine } from "../../lib/types/machine";

type Props = {
  machine: Machine;
};

/** Feste 3-Spalten-Medien: Bild Mitte, QR rechts oben (kein Stapeln). */
export default function ArbeitsauftragSheetMedia({ machine }: Props) {
  return (
    <>
      <div className="aaSheetImageCol">
        <div className={`machineImageSlot ${machine.image ? "hasMachineImage" : ""}`}>
          {machine.image ? (
            <img className="machineImagePreview" src={machine.image} alt="Maschinenbild" />
          ) : (
            <span>Maschinenbild</span>
          )}
        </div>
      </div>
      <div className="aaSheetQrCol">
        <div
          className={`machineQrSlot ${machine.qr_code ? "hasQrImage machineQrLabeled" : ""}`}
        >
          {machine.qr_code ? (
            <img
              className="machineQrImage"
              src={machine.qr_code}
              alt={`QR Code ${formatValue(machine.geraetenummer)}`}
            />
          ) : (
            <div className="qrPlaceholder">
              <span />
              <span />
              <span />
              <span />
            </div>
          )}
          {!machine.qr_code ? <p>QR Code</p> : null}
        </div>
      </div>
    </>
  );
}
