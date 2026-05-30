"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import GermanDateField from "./GermanDateField";
import {
  ARBEITSAUFTRAG_SHEET_SKIP_FIELDS,
  GERAETTYP_OPTIONS,
  filterArbeitsauftragSheetFields,
  formatMachineGeraetenummerLine,
  formatValue,
  hasValue,
  machineToStammdatenFields,
  sanitizeNumericFieldInput,
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

export type ArbeitsauftragWorksheetMachineBlockHandle = {
  getFields: () => StammdatenField[];
};

type Props = {
  machine: Machine;
  order: WorkOrder;
  /** Nur Leseansicht: Felder von außen (z. B. Druck) */
  stammdatenFields?: StammdatenField[];
  username?: string;
  editable?: boolean;
  canWrite?: boolean;
  /** Bearbeiten: alle Zeilen, auch leer */
  showAllFields?: boolean;
  className?: string;
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

const ArbeitsauftragWorksheetMachineBlock = forwardRef<
  ArbeitsauftragWorksheetMachineBlockHandle,
  Props
>(function ArbeitsauftragWorksheetMachineBlock(
  {
    machine,
    order,
    stammdatenFields: stammdatenFieldsProp,
    username,
    editable = false,
    canWrite = false,
    showAllFields = false,
    className = "",
  },
  ref
) {
  const [formFields, setFormFields] = useState<StammdatenField[]>(() =>
    machineToStammdatenFields(machine)
  );

  useEffect(() => {
    setFormFields(machineToStammdatenFields(machine));
  }, [machine]);

  useImperativeHandle(ref, () => ({
    getFields: () => formFields,
  }));

  const bearbeiter = order.updatedBy || order.createdBy || username || "—";
  const auftragNr = formatWorkOrderAuftragNr(order);
  const geraetenummerLine = formatMachineGeraetenummerLine(machine);

  const displayFields = editable
    ? filterArbeitsauftragSheetFields(formFields, { showEmpty: showAllFields })
    : filterArbeitsauftragSheetFields(
        stammdatenFieldsProp ?? machineToStammdatenFields(machine)
      );

  function updateField(index: number, value: string) {
    setFormFields((prev) =>
      prev.map((field, i) => (i === index ? { ...field, value } : field))
    );
  }

  function renderFieldValue(field: StammdatenField, index: number) {
    if (!editable) {
      return (
        <strong className={fieldValueClass(field)}>
          {hasValue(field.value) ? field.value : "—"}
        </strong>
      );
    }

    if (field.dbKey === "meldung_status") {
      return (
        <strong className={fieldValueClass(field)}>
          {field.value || "Keine Meldung"}
        </strong>
      );
    }

    if (field.dbKey === "geraettyp") {
      return (
        <select
          className={`aaWorksheetValue aaSheetInput ${fieldValueClass(field)}`}
          value={field.value}
          disabled={!canWrite}
          onChange={(e) => updateField(index, e.target.value)}
        >
          <option value="">—</option>
          {GERAETTYP_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.dbKey === "damage_status") {
      const statusClass = stammdatenStatusClassName(field.value);
      return (
        <select
          className={[
            "aaWorksheetValue",
            "aaSheetInput",
            "statusSelect",
            statusClass,
            statusClass ? `status-${statusClass}` : "",
          ]
            .filter(Boolean)
            .join(" ")}
          value={field.value}
          disabled={!canWrite}
          onChange={(e) => updateField(index, e.target.value)}
        >
          <option value="">—</option>
          <option value="Fertig">Fertig</option>
          <option value="In Reperatur">In Reperatur</option>
        </select>
      );
    }

    if (field.type === "date") {
      return (
        <div className="aaSheetDateField">
          <GermanDateField
            value={field.value}
            readOnly={!canWrite}
            onChange={(next) => updateField(index, next)}
          />
        </div>
      );
    }

    if (field.dbKey) {
      return (
        <input
          type="text"
          className={`aaWorksheetValue aaSheetInput ${fieldValueClass(field)}`}
          inputMode={field.type === "number" ? "decimal" : undefined}
          value={field.value}
          readOnly={!canWrite}
          onChange={(e) =>
            updateField(
              index,
              field.type === "number"
                ? sanitizeNumericFieldInput(e.target.value)
                : e.target.value
            )
          }
          placeholder="—"
        />
      );
    }

    return <span className="aaWorksheetValue">—</span>;
  }

  const sectionClass = [
    "aaWorksheetMachine",
    "card",
    "aaMachineOverview",
    "aaMachineOverviewSheet",
    "aaBlock",
    editable ? "aaSheetEditing" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={sectionClass}>
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
          <div className="fieldGrid aaStammdatenGrid aaWorksheetStammdaten aaSheetFieldTable">
            <div className="fieldRow aaFieldRow aaSheetHeroRow">
              <span>Gerätenummer</span>
              <strong className="aaWorksheetValue aaSheetFieldValueHero">
                {geraetenummerLine || formatValue(machine.geraetenummer)}
              </strong>
            </div>
            {formFields.map((field, index) => {
              if (field.dbKey && ARBEITSAUFTRAG_SHEET_SKIP_FIELDS.has(field.dbKey)) {
                return null;
              }
              if (!editable) {
                if (!displayFields.some((visible) => visible.label === field.label)) {
                  return null;
                }
              } else if (
                !showAllFields &&
                !filterArbeitsauftragSheetFields([field]).length
              ) {
                return null;
              }
              return (
                <div key={field.label} className="fieldRow aaFieldRow">
                  <span>{field.label}</span>
                  {renderFieldValue(field, index)}
                </div>
              );
            })}
          </div>
        </div>
        <ArbeitsauftragSheetMedia machine={machine} />
      </div>
    </section>
  );
});

export default ArbeitsauftragWorksheetMachineBlock;
