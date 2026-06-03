"use client";

import { forwardRef } from "react";
import { collectBemerkungLines } from "../../lib/arbeitsauftrag-protokoll";
import { formatValue, hasValue, type StammdatenField } from "../../lib/machines";
import {
  formatOrderType,
  formatWorkHoursDisplay,
  type WorkOrder,
} from "../../lib/work-orders";
import type { SessionAuthSlice } from "../../lib/machine-permissions";
import type { Machine } from "../../lib/types/machine";
import ArbeitsauftragWorksheetMachineBlock, {
  type ArbeitsauftragWorksheetMachineBlockHandle,
} from "./ArbeitsauftragWorksheetMachineBlock";

type Props = {
  machine: Machine;
  order: WorkOrder;
  stammdatenFields?: StammdatenField[];
  username?: string;
  editable?: boolean;
  canWrite?: boolean;
  sessionAuth?: SessionAuthSlice;
  /** Bearbeiten: nur Maschinenblock (Protokoll darunter im Formular) */
  machineBlockOnly?: boolean;
};

const ArbeitsauftragPrintDocument = forwardRef<
  ArbeitsauftragWorksheetMachineBlockHandle,
  Props
>(function ArbeitsauftragPrintDocument(
  {
    machine,
    order,
    stammdatenFields,
    username,
    editable = false,
    canWrite = false,
    sessionAuth = { permissions: [], groups: [] },
    machineBlockOnly = false,
  },
  ref
) {
  const bemerkungLines = collectBemerkungLines(order.protocol);
  const showBemerkungBlock =
    bemerkungLines.length > 0 || hasValue(order.notes);
  const arbeitsstundenDisplay = formatWorkHoursDisplay(order.workHours);

  return (
    <div className="arbeitsauftragDocument aaForm aaFormView aaPrintLayout">
      <ArbeitsauftragWorksheetMachineBlock
        ref={ref}
        machine={machine}
        order={order}
        stammdatenFields={stammdatenFields}
        username={username}
        editable={editable}
        canWrite={canWrite}
        sessionAuth={sessionAuth}
      />

      {machineBlockOnly ? null : showBemerkungBlock ? (
        <section className="protocolSection aaBlock aaPrintBemerkungBlock">
          <h2 className="spacedTitle">Bemerkung:</h2>
          {bemerkungLines.length > 0 ? (
            <ul className="aaBemerkungCheckSummaryList aaBemerkungCheckSummaryListPrint">
              {bemerkungLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          {hasValue(order.notes) ? (
            <p className="arbeitsauftragPrintNotes aaPrintBemerkungLine">{order.notes}</p>
          ) : null}
        </section>
      ) : null}

      <section className="protocolSection aaBlock aaPrintArbeitsstundenBlock">
        <h2 className="spacedTitle">Arbeitsstunden</h2>
        <dl className="aaPrintArbeitsstunden">
          <dt>Bearbeitungszeit</dt>
          <dd>{arbeitsstundenDisplay}</dd>
        </dl>
      </section>

      {machineBlockOnly ? null : (
        <footer className="arbeitsauftragPrintFooter aaFooter">
          <span>BOCSA · Arbeitsauftrag</span>
          <span>
            {formatValue(machine.geraetenummer)} · {formatOrderType(order.type)} ·{" "}
            {order.date}
          </span>
        </footer>
      )}
    </div>
  );
});

export default ArbeitsauftragPrintDocument;
