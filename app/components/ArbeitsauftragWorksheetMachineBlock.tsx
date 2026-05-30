"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { machineToStammdatenFields, type StammdatenField } from "../../lib/machines";
import {
  formatOrderType,
  formatWorkOrderAuftragNr,
  type WorkOrder,
} from "../../lib/work-orders";
import type { Machine } from "../../lib/types/machine";
import MachineStammdatenPanelContent from "./MachineStammdatenPanelContent";

export type ArbeitsauftragWorksheetMachineBlockHandle = {
  getFields: () => StammdatenField[];
};

type Props = {
  machine: Machine;
  order: WorkOrder;
  stammdatenFields?: StammdatenField[];
  username?: string;
  editable?: boolean;
  canWrite?: boolean;
  className?: string;
};

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

  const isEditing = editable;
  const fields = isEditing ? formFields : (stammdatenFieldsProp ?? formFields);

  const bearbeiter = order.updatedBy || order.createdBy || username || "—";
  const auftragNr = formatWorkOrderAuftragNr(order);

  function updateField(index: number, value: string) {
    setFormFields((prev) =>
      prev.map((field, i) => (i === index ? { ...field, value } : field))
    );
  }

  const sectionClass = [
    "aaWorksheetMachine",
    "machineDetailPage",
    "aaBlock",
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

      <MachineStammdatenPanelContent
        machine={machine}
        stammdatenForm={fields}
        isEditing={isEditing}
        canWrite={canWrite}
        onUpdateField={updateField}
      />
    </section>
  );
});

export default ArbeitsauftragWorksheetMachineBlock;
