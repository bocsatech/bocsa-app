"use client";

import type { ReactNode } from "react";
import type { Machine } from "../../lib/types/machine";
import MachineHeroMedia from "./MachineHeroMedia";

type Props = {
  machine: Machine;
  stammdaten: ReactNode;
};

export default function ArbeitsauftragMachineOverview({ machine, stammdaten }: Props) {
  return (
    <article className="card aaMachineOverview aaMachineOverviewSheet aaBlock arbeitsauftragHideOnPrint">
      <div className="aaMachineOverviewBody">
        <div className="aaMachineOverviewLeft">
          <div className="aaStammdatenWrap">{stammdaten}</div>
        </div>
        <MachineHeroMedia machine={machine} className="aaMachineOverviewMedia" />
      </div>
    </article>
  );
}
