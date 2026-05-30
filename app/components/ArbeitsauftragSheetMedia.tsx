"use client";

import type { Machine } from "../../lib/types/machine";

type Props = {
  machine: Machine;
};

/** Arbeitsauftrag-Munkalap: nur Maschinenbild rechts (ohne QR). */
export default function ArbeitsauftragSheetMedia({ machine }: Props) {
  return (
    <div className="aaSheetImageCol">
      <div className={`machineImageSlot ${machine.image ? "hasMachineImage" : ""}`}>
        {machine.image ? (
          <img className="machineImagePreview" src={machine.image} alt="Maschinenbild" />
        ) : (
          <span>Maschinenbild</span>
        )}
      </div>
    </div>
  );
}
