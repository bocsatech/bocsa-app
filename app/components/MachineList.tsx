"use client";

import { useRouter } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import { isLocalHostEnvironment } from "../../lib/local-host";
import {
  formatDate,
  formatValue,
  getInternExpiryValue,
  getLastServiceDateValue,
  hasValue,
} from "../../lib/machines";
import type { MachineRecord } from "../../lib/machines";
import type { Machine } from "../../lib/types/machine";
import MachineStatusIndicators from "./MachineStatusIndicators";

type Props = {
  machines: Machine[];
};

function subscribeNoop() {
  return () => {};
}

function readHideDuplicateMetaDates() {
  return isLocalHostEnvironment();
}

export default function MachineList({ machines }: Props) {
  const router = useRouter();
  const hideDuplicateMetaDates = useSyncExternalStore(
    subscribeNoop,
    readHideDuplicateMetaDates,
    () => false
  );

  const sortedMachines = useMemo(() => {
    return [...machines].sort((a, b) => {
      const aValue = getColumnValue(a, "geraetenummer").toLowerCase();
      const bValue = getColumnValue(b, "geraetenummer").toLowerCase();
      return aValue.localeCompare(bValue, "de");
    });
  }, [machines]);

  if (machines.length === 0) {
    return (
      <article className="card">
        <p style={{ margin: 0, color: "#6b7280" }}>
          Keine Treffer. Andere Gerätenummer oder QR-Code versuchen.
        </p>
      </article>
    );
  }

  return (
    <article className="card machineResultCard">
      <div className="machineResultList">
        {sortedMachines.map((row) => (
          <MachineResultRow
            key={row.id}
            row={row}
            hideDuplicateMetaDates={hideDuplicateMetaDates}
            onOpen={() => router.push(`/maschinen/${row.id}`)}
          />
        ))}
      </div>
    </article>
  );
}

function MachineResultRow({
  row,
  hideDuplicateMetaDates,
  onOpen,
}: {
  row: Machine;
  hideDuplicateMetaDates: boolean;
  onOpen: () => void;
}) {
  const machine = row as MachineRecord;

  return (
    <button type="button" className="machineResultRow" onClick={onOpen}>
      <MachineStatusIndicators machine={machine} className="machineResultStatus" />

      <span className="machineThumb" aria-label="Bild">
        {row.image ? <img src={row.image} alt="" /> : <span>Bild</span>}
      </span>

      <span className="machineResultMain">
        <span className="machineResultTitle">
          <strong>Gerätenummer</strong>
          <b>{formatValue(getColumnValue(row, "geraetenummer"))}</b>
        </span>
        <MachineField className="machineResultTitle" label="Bezeichnung" value={row.bezeichnung} strongValue />
        <MachineField className="machineResultDetail" label="Seriennummer" value={row.serial_number} />
      </span>

      <span className="machineResultMeta">
        {hideDuplicateMetaDates ? null : (
          <MachineField label="Prüfung" value={getColumnValue(row, "inspection")} format="date" />
        )}
        <MachineField label="Ext. §78-ÖVE E8701" value={row.elektro_ove} format="date" />
        {hideDuplicateMetaDates ? null : (
          <MachineField
            label="Intern §11 gültig bis"
            value={getInternExpiryValue(machine)}
            format="date"
          />
        )}
      </span>

      <span className="machineResultMeta">
        <MachineField label="Depot" value={row.depot} />
        <MachineField label="Letztes Service" value={getLastServiceDateValue(machine)} format="date" />
      </span>
    </button>
  );
}

function MachineField({
  label,
  value,
  className,
  format,
  strongValue = false,
}: {
  label: string;
  value: unknown;
  className?: string;
  format?: "date";
  strongValue?: boolean;
}) {
  if (!hasValue(value)) return null;

  const content = format === "date" ? formatDate(value) : formatValue(value);
  return (
    <span className={className}>
      <strong>{label}</strong>
      {strongValue ? <b>{content}</b> : content}
    </span>
  );
}

function getColumnValue(machine: Machine, key: "status" | "inspection" | "geraetenummer" | "depot") {
  if (key === "inspection") {
    return machine.prufung ?? machine.tpg_hebetechnik ?? machine.elektro_ove ?? machine.section_57a ?? "";
  }

  if (key === "geraetenummer") {
    return machine.geraetenummer ?? "";
  }

  return machine.depot ?? "";
}
