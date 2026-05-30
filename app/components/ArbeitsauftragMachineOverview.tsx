"use client";

import type { ReactNode } from "react";
import {
  formatOrderType,
  formatWorkOrderAuftragNr,
  type WorkOrder,
} from "../../lib/work-orders";
import type { Machine } from "../../lib/types/machine";
import ArbeitsauftragSheetMedia from "./ArbeitsauftragSheetMedia";

type Props = {
  machine: Machine;
  stammdaten: ReactNode;
  order?: WorkOrder;
  username?: string;
};

export default function ArbeitsauftragMachineOverview({
  machine,
  stammdaten,
  order,
  username,
}: Props) {
  const bearbeiter =
    order?.updatedBy || order?.createdBy || username || "—";
  const auftragNr = order ? formatWorkOrderAuftragNr(order) : "";

  return (
    <section className="aaWorksheetMachine card aaMachineOverview aaMachineOverviewSheet aaBlock aaSheetEditing arbeitsauftragHideOnPrint">
      {order ? (
        <div className="aaWorksheetAuftragBand">
          <span className="aaWorksheetAuftragLabel">Arbeitsauftrag</span>
          <span className="aaWorksheetAuftragMeta">
            {formatOrderType(order.type)}
            {auftragNr && auftragNr !== "—" ? ` · ${auftragNr}` : ""}
            {order.date ? ` · ${order.date}` : ""}
            {order.time ? ` ${order.time}` : ""}
            {bearbeiter !== "—" ? ` · ${bearbeiter}` : ""}
          </span>
        </div>
      ) : null}

      <div className="aaMachineOverviewBody aaSheetLayoutGrid">
        <div className="aaMachineOverviewLeft">{stammdaten}</div>
        <ArbeitsauftragSheetMedia machine={machine} />
      </div>
    </section>
  );
}
