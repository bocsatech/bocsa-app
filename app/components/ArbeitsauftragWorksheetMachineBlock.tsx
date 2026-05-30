"use client";

import {
  filterArbeitsauftragSheetFields,
  formatMachineGeraetenummerLine,
  formatValue,
  hasValue,
  stammdatenStatusClassName,
  type StammdatenField,
} from "../../lib/machines";
import {
  formatOrderType,
  formatWorkOrderAuftragNr,
  type WorkOrder,
} from "../../lib/work-orders";
import type { Machine } from "../../lib/types/machine";
import ArbeitsauftragSheetMedia from "./ArbeitsauftragSheetMedia";

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

  const visibleFields = filterArbeitsauftragSheetFields(stammdatenFields);

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

      <div className="aaMachineOverviewBody aaSheetLayoutGrid">
        <div className="aaMachineOverviewLeft">
          <div className="fieldGrid aaStammdatenGrid stammdatenStacked aaWorksheetStammdaten aaSheetFieldTable">
            <div className="fieldRow aaFieldRow aaSheetHeroRow">
              <span>Gerätenummer</span>
              <strong className="aaWorksheetValue aaSheetFieldValueHero">
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
        <ArbeitsauftragSheetMedia machine={machine} />
      </div>
    </section>
  );
}
