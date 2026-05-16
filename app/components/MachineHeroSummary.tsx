"use client";

import { formatValue } from "../../lib/machines";
import type { Machine } from "../../lib/types/machine";

type Props = {
  machine: Machine;
};

export default function MachineHeroSummary({ machine }: Props) {
  return (
    <header className="machineHero">
      <div className="machineHeroInfo">
        <span className="badge">Maschine</span>
        <h1>
          {formatValue(machine.geraetenummer)}
          {machine.subgroup ? ` — ${machine.subgroup}` : ""}
        </h1>
        <p className="subtitle">
          {machine.serial_number ? `SN ${machine.serial_number}` : ""}
          {machine.depot ? ` · Depot ${machine.depot}` : ""}
        </p>
      </div>

      <div className="machineHeroMedia">
        <div className={`machineImageSlot ${machine.image ? "hasMachineImage" : ""}`}>
          {machine.image ? (
            <img className="machineImagePreview" src={machine.image} alt="Maschinenbild" />
          ) : (
            <span>Maschinenbild</span>
          )}
        </div>
        <div className={`machineQrSlot ${machine.qr_code ? "hasQrImage machineQrLabeled" : ""}`}>
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
    </header>
  );
}
