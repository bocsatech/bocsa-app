"use client";

import type { ReactNode } from "react";
import { formatValue } from "../../lib/machines";
import type { Machine } from "../../lib/types/machine";
import MachineHeroMedia from "./MachineHeroMedia";

type Props = {
  machine: Machine;
  stammdaten: ReactNode;
};

export default function ArbeitsauftragMachineOverview({ machine, stammdaten }: Props) {
  const subtitle = [
    machine.serial_number ? `SN ${machine.serial_number}` : null,
    machine.depot ? `Depot ${machine.depot}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="card aaMachineOverview aaBlock arbeitsauftragHideOnPrint">
      <div className="aaMachineOverviewBody">
        <div className="aaMachineOverviewLeft">
          <span className="badge">Maschine</span>
          <h2 className="aaMachineOverviewTitle">
            {formatValue(machine.geraetenummer)}
            {machine.subgroup ? ` — ${machine.subgroup}` : ""}
          </h2>
          {machine.bezeichnung ? (
            <p className="aaMachineOverviewName">{machine.bezeichnung}</p>
          ) : null}
          {subtitle ? <p className="aaMachineOverviewMeta">{subtitle}</p> : null}
          <div className="aaStammdatenWrap">{stammdaten}</div>
        </div>
        <MachineHeroMedia machine={machine} className="aaMachineOverviewMedia" />
      </div>
    </article>
  );
}
