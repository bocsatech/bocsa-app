"use client";

import {
  ARBEITSAUFTRAG_SHEET_SKIP_FIELDS,
  formatMachineGeraetenummerLine,
  formatValue,
  hasValue,
  stammdatenFieldHasContent,
  stammdatenStatusClassName,
  type StammdatenField,
} from "../../lib/machines";
import {
  formatOrderType,
  formatWorkOrderAuftragNr,
  type WorkOrder,
} from "../../lib/work-orders";
import type { Machine } from "../../lib/types/machine";
import MachineHeroMedia from "./MachineHeroMedia";

type Props = {
  machine: Machine;
  order: WorkOrder;
  stammdatenFields: StammdatenField[];
  username?: string;
};

function fieldValueClass(field: StammdatenField) {
  if (field.dbKey === "meldung_status") {
    return field.value.toLowerCase().includes("vorhanden")
      ? "aaWorksheetValue meldungStatusValue danger"
      : "aaWorksheetValue meldungStatusValue ok";
  }
  if (field.dbKey === "damage_status") {
    const status = stammdatenStatusClassName(field.value);
    return status
      ? `aaWorksheetValue statusValue status-${status}`
      : "aaWorksheetValue";
  }
  return "aaWorksheetValue";
}

export default function ArbeitsauftragWorksheetMachineBlock({
  machine,
  order,
  stammdatenFields,
  username,
}: Props) {
  const bearbeiter = order.updatedBy || order.createdBy || username || "—";
  const auftragNr = formatWorkOrderAuftragNr(order);
  const geraetenummerLine = formatMachineGeraetenummerLine(machine);

  const visibleFields = stammdatenFields.filter((field) => {
    if (field.dbKey && ARBEITSAUFTRAG_SHEET_SKIP_FIELDS.has(field.dbKey)) return false;
    return stammdatenFieldHasContent(field) || field.dbKey === "meldung_status";
  });

  return (
    <section className="aaWorksheetMachine card aaMachineOverview aaMachineOverviewSheet aaBlock">
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

      <div className="aaMachineOverviewBody">
        <div className="aaMachineOverviewLeft">
          <div className="fieldGrid aaStammdatenGrid stammdatenStacked aaWorksheetStammdaten">
            <div className="fieldRow aaFieldRow aaSheetHeroRow">
              <span>Gerätenummer</span>
              <strong className="aaWorksheetValue aaSheetHeroValue">
                {geraetenummerLine || formatValue(machine.geraetenummer)}
              </strong>
            </div>
            {visibleFields.map((field) => (
              <div key={field.label} className="fieldRow aaFieldRow">
                <span>{field.label}</span>
                <strong className={fieldValueClass(field)}>
                  {hasValue(field.value) ? field.value : "—"}
                </strong>
              </div>
            ))}
          </div>
        </div>
        <MachineHeroMedia machine={machine} className="aaMachineOverviewMedia" />
      </div>
    </section>
  );
}
