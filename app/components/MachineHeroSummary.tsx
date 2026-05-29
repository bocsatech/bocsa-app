"use client";

import { formatValue } from "../../lib/machines";
import type { Machine } from "../../lib/types/machine";
import MachineHeroMedia from "./MachineHeroMedia";

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

      <MachineHeroMedia machine={machine} />
    </header>
  );
}
