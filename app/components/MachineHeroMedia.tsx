"use client";

import { formatValue } from "../../lib/machines";
import { getMachineQrImageUrl } from "../../lib/machine-qr-display";
import type { Machine } from "../../lib/types/machine";

type Props = {
  machine: Machine;
  className?: string;
  /** QR-Code ausblenden (z. B. Maschine hinzufügen) */
  showQrCode?: boolean;
};

export default function MachineHeroMedia({
  machine,
  className = "",
  showQrCode = true,
}: Props) {
  const mediaClass = ["machineHeroMedia", className].filter(Boolean).join(" ");
  const qrSrc = machine.id ? getMachineQrImageUrl(machine.id) : machine.qr_code ?? null;
  const qrLabel = formatValue(machine.geraetenummer);

  return (
    <div className={mediaClass}>
      <div className={`machineImageSlot ${machine.image ? "hasMachineImage" : ""}`}>
        {machine.image ? (
          <img className="machineImagePreview" src={machine.image} alt="Maschinenbild" />
        ) : (
          <span>Maschinenbild</span>
        )}
      </div>
      {showQrCode ? (
        <div className={`machineQrSlot ${qrSrc ? "hasQrImage machineQrLabeled" : ""}`}>
          {qrSrc ? (
            <>
              <img
                className="machineQrImage"
                src={qrSrc}
                alt={`QR Code ${qrLabel}`}
              />
              {qrLabel ? <p className="machineQrCaption">{qrLabel}</p> : null}
            </>
          ) : (
            <div className="qrPlaceholder">
              <span />
              <span />
              <span />
              <span />
            </div>
          )}
          {!qrSrc ? <p>QR Code</p> : null}
        </div>
      ) : null}
    </div>
  );
}
