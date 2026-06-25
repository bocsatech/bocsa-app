"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  formatDate,
  formatValue,
  getLastServiceDateValue,
  hasValue,
} from "../../lib/machines";
import { getLastRecordedBetriebsstundenDisplay } from "../../lib/work-orders";
import type { MachineRecord } from "../../lib/machines";
import type { Machine } from "../../lib/types/machine";
import MachineStatusIndicators from "./MachineStatusIndicators";

type Props = {
  machines: Machine[];
  /** Keresés után: rangsorolt sorrend megtartása (Enter = első sor). */
  preserveOrder?: boolean;
  highlightFirst?: boolean;
};

export default function MachineList({
  machines,
  preserveOrder = false,
  highlightFirst = false,
}: Props) {
  const router = useRouter();

  const sortedMachines = useMemo(() => {
    if (preserveOrder) return machines;
    return [...machines].sort((a, b) => {
      const aValue = getColumnValue(a, "geraetenummer").toLowerCase();
      const bValue = getColumnValue(b, "geraetenummer").toLowerCase();
      return aValue.localeCompare(bValue, "de");
    });
  }, [machines, preserveOrder]);

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
        {sortedMachines.map((row, index) => (
          <MachineResultRow
            key={row.id}
            row={row}
            highlighted={highlightFirst && index === 0}
            onOpen={() => router.push(`/maschinen/${row.id}`)}
          />
        ))}
      </div>
    </article>
  );
}

function MachineResultRow({
  row,
  onOpen,
  highlighted = false,
}: {
  row: Machine;
  onOpen: () => void;
  highlighted?: boolean;
}) {
  const machine = row as MachineRecord;

  return (
    <button
      type="button"
      className={["machineResultRow", highlighted ? "isQuickSearchTop" : ""]
        .filter(Boolean)
        .join(" ")}
      onClick={onOpen}
    >
      <MachineStatusIndicators machine={machine} className="machineResultStatus" />

      <span className="machineThumb" aria-label="Bild">
        {row.image ? <img src={row.image} alt="" /> : <span>Bild</span>}
      </span>

      <span className="machineResultMain">
        <MachineField label="Gerätenummer" value={getColumnValue(row, "geraetenummer")} strongValue />
        <MachineField label="Bezeichnung" value={row.bezeichnung} strongValue />
        <MachineField label="Seriennummer" value={row.serial_number} mutedValue />
      </span>

      <span className="machineResultMeta machineResultCenter">
        <MachineField
          label="Betriebsstunden"
          value={getLastRecordedBetriebsstundenDisplay(machine)}
        />
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
  format,
  strongValue = false,
  mutedValue = false,
}: {
  label: string;
  value: unknown;
  format?: "date";
  strongValue?: boolean;
  mutedValue?: boolean;
}) {
  if (!hasValue(value)) return null;

  const content = format === "date" ? formatDate(value) : formatValue(value);
  const valueClassName = [
    "machineResultValue",
    strongValue ? "machineResultValueStrong" : "",
    mutedValue ? "machineResultValueMuted" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <strong className="machineResultLabel">{label}:</strong>
      {strongValue ? (
        <b className={valueClassName}>{content}</b>
      ) : (
        <span className={valueClassName}>{content}</span>
      )}
    </>
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
