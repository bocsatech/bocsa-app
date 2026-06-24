"use client";

import {
  ARBEITSAUFTRAG_SHEET_SKIP_FIELDS,
  filterArbeitsauftragSheetFields,
  formatMachineGeraetenummerLine,
  formatValue,
  hasValue,
  machineToStammdatenFields,
  stammdatenStatusClassName,
  type StammdatenField,
} from "../../lib/machines";
import {
  DEFAULT_GERAETENUMMER_CODES,
  deriveGeraetegruppeFromGeraetenummer,
  parseStructuredGeraetenummer,
} from "../../lib/geraetenummer";
import {
  formatOrderType,
  formatWorkOrderAuftragNr,
  type WorkOrder,
} from "../../lib/work-orders";
import { resolveOrderRepairStatus } from "../../lib/geraetstatus";
import type { Machine } from "../../lib/types/machine";
import ArbeitsauftragSheetMedia from "./ArbeitsauftragSheetMedia";
import GeraetstatusSelect from "./GeraetstatusSelect";

type Props = {
  machine: Machine;
  order: WorkOrder;
  stammdatenFields?: StammdatenField[];
  username?: string;
};

function enrichPrintStammdatenFields(
  machine: Machine,
  fields: StammdatenField[]
): StammdatenField[] {
  const parsed = parseStructuredGeraetenummer(machine.geraetenummer);
  const derivedGroup = deriveGeraetegruppeFromGeraetenummer(machine.geraetenummer);
  const derivedTyp =
    parsed &&
    DEFAULT_GERAETENUMMER_CODES.klassen.find(
      (entry) => entry.code === parsed.klasse
    )?.geraettyp;

  return fields.map((field) => {
    if (field.dbKey === "subgroup" && !hasValue(field.value) && hasValue(derivedGroup)) {
      return { ...field, value: derivedGroup };
    }
    if (field.dbKey === "geraettyp" && !hasValue(field.value) && hasValue(derivedTyp)) {
      return { ...field, value: derivedTyp ?? "" };
    }
    if (field.dbKey === "subgroup" && !hasValue(field.value) && hasValue(machine.subgroup)) {
      return { ...field, value: String(machine.subgroup) };
    }
    if (field.dbKey === "geraettyp" && !hasValue(field.value) && hasValue(machine.geraettyp)) {
      return { ...field, value: String(machine.geraettyp) };
    }
    return field;
  });
}

function printFieldValueClass(field: StammdatenField) {
  if (field.dbKey === "geraettyp") return "aaWorksheetValue aaSheetFieldValueMuted";
  if (field.dbKey === "damage_status") {
    const status = stammdatenStatusClassName(field.value);
    if (status === "fertig") return "aaWorksheetValue aaSheetFieldValueOk";
    if (status === "repair") return "aaWorksheetValue aaSheetFieldValueDanger";
  }
  if (field.dbKey === "meldung_status") {
    return field.value.toLowerCase().includes("vorhanden")
      ? "aaWorksheetValue meldungStatusValue danger"
      : "aaWorksheetValue meldungStatusValue ok";
  }
  return "aaWorksheetValue";
}

export default function ArbeitsauftragPrintMachineBlock({
  machine,
  order,
  stammdatenFields,
  username,
}: Props) {
  const bearbeiter = order.updatedBy || order.createdBy || username || "—";
  const auftragNr = formatWorkOrderAuftragNr(order);
  const baseFields = enrichPrintStammdatenFields(
    machine,
    stammdatenFields ?? machineToStammdatenFields(machine)
  );
  const rows = filterArbeitsauftragSheetFields(baseFields, { showEmpty: false });
  const geratstatus = resolveOrderRepairStatus(order, machine);

  return (
    <section className="aaWorksheetMachine aaMachineOverview aaMachineOverviewSheet aaBlock">
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
          <div className="fieldGrid aaStammdatenGrid stammdatenStacked aaSheetFieldTable aaWorksheetStammdaten">
            <div className="fieldRow aaFieldRow aaSheetHeroRow">
              <span>Gerätenummer</span>
              <strong className="aaWorksheetValue aaSheetFieldValueHero">
                {formatMachineGeraetenummerLine(machine) ||
                  formatValue(machine.geraetenummer)}
              </strong>
            </div>
            {rows.map((field) => {
              if (field.dbKey && ARBEITSAUFTRAG_SHEET_SKIP_FIELDS.has(field.dbKey)) {
                return null;
              }
              if (field.dbKey === "damage_status") {
                return null;
              }
              const value = field.value?.trim() ? field.value : "—";
              return (
                <div key={field.label} className="fieldRow aaFieldRow">
                  <span>{field.label}</span>
                  {field.dbKey === "meldung_status" ? (
                    <strong className={printFieldValueClass(field)}>
                      {value === "—" ? "Keine Meldung" : value}
                    </strong>
                  ) : (
                    <span className={printFieldValueClass(field)}>{value}</span>
                  )}
                </div>
              );
            })}
            <div className="fieldRow aaFieldRow">
              <span>Gerätstatus</span>
              <GeraetstatusSelect value={geratstatus} readOnly />
            </div>
          </div>
        </div>
        <ArbeitsauftragSheetMedia machine={machine} />
      </div>
    </section>
  );
}
