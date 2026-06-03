"use client";

import { forwardRef } from "react";
import { collectBemerkungLines } from "../../lib/arbeitsauftrag-protokoll";
import { formatValue, hasValue, type StammdatenField } from "../../lib/machines";
import { formatOrderType, type WorkOrder } from "../../lib/work-orders";
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
    machineBlockOnly = false,
  },
  ref
) {
  const bemerkungLines = collectBemerkungLines(order.protocol);

  return (
    <div className="arbeitsauftragDocument aaForm aaFormView">
      <ArbeitsauftragWorksheetMachineBlock
        ref={ref}
        machine={machine}
        order={order}
        stammdatenFields={stammdatenFields}
        username={username}
        editable={editable}
        canWrite={canWrite}
      />

      {machineBlockOnly ? null : (
        <>
          {bemerkungLines.length > 0 || hasValue(order.notes) ? (
            <section className="protocolSection card aaBlock">
              <h2 className="spacedTitle">Bemerkung:</h2>
              {bemerkungLines.length > 0 ? (
                <ul className="aaBemerkungCheckSummaryList aaBemerkungCheckSummaryListPrint">
                  {bemerkungLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              {hasValue(order.notes) ? (
                <p className="arbeitsauftragPrintNotes">{order.notes}</p>
              ) : null}
            </section>
          ) : null}

          <footer className="arbeitsauftragPrintFooter aaFooter">
            <span>BOCSA · Arbeitsauftrag</span>
            <span>
              {formatValue(machine.geraetenummer)} · {formatOrderType(order.type)} ·{" "}
              {order.date}
            </span>
          </footer>
        </>
      )}
    </div>
  );
});

export default ArbeitsauftragPrintDocument;
