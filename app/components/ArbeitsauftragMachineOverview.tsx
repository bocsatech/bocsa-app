"use client";

import type { ReactNode } from "react";
import type { Machine } from "../../lib/types/machine";
import ArbeitsauftragSheetMedia from "./ArbeitsauftragSheetMedia";

type Props = {
  machine: Machine;
  stammdaten: ReactNode;
};

export default function ArbeitsauftragMachineOverview({ machine, stammdaten }: Props) {
  return (
    <article className="card aaMachineOverview aaMachineOverviewSheet aaBlock arbeitsauftragHideOnPrint">
      <div className="aaMachineOverviewBody aaSheetLayoutGrid">
        <div className="aaMachineOverviewLeft">{stammdaten}</div>
        <ArbeitsauftragSheetMedia machine={machine} />
      </div>
    </article>
  );
}
