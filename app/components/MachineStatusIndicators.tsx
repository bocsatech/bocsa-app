"use client";

import { formatGermanMonthYear } from "../../lib/dates";
import {
  formatDate,
  formatValue,
  getGeratstatusValue,
  getGeratstatusVariant,
  getInternExpiryValue,
  getLastServiceDateValue,
  getServiceValidUntil,
  hasValue,
  isValidOnOrBefore,
  parseDateOnly,
} from "../../lib/machines";
import type { MachineRecord } from "../../lib/machines";

type Props = {
  machine: MachineRecord;
  className?: string;
  /** Liste: immer 3 Zeilen, damit Karten bündig bleiben */
  fixedSlots?: boolean;
  /** Localhost: nur farbige Markierungen ohne Datums-Text */
  marksOnly?: boolean;
};

export default function MachineStatusIndicators({
  machine,
  className = "",
  fixedSlots = false,
  marksOnly = false,
}: Props) {
  const geratstatus = <GeratstatusIndicator machine={machine} marksOnly={marksOnly} />;
  const intern = (
    <InternIndicator value={getInternExpiryValue(machine)} marksOnly={marksOnly} />
  );
  const service = (
    <ServiceIndicator lastServiceDate={getLastServiceDateValue(machine)} marksOnly={marksOnly} />
  );

  if (!fixedSlots) {
    return (
      <div
        className={`machineStatusIndicators${marksOnly ? " machineStatusIndicatorsMarksOnly" : ""} ${className}`.trim()}
      >
        {geratstatus}
        {intern}
        {service}
      </div>
    );
  }

  const slots = [
    { key: "status", node: geratstatus },
    { key: "intern", node: intern },
    { key: "service", node: service },
  ];

  return (
    <div className={`machineStatusIndicators machineStatusIndicatorsFixed ${className}`.trim()}>
      {slots.map((slot) => (
        <div key={slot.key} className="machineStatusSlot">
          {slot.node}
        </div>
      ))}
    </div>
  );
}

function GeratstatusIndicator({
  machine,
  marksOnly = false,
}: {
  machine: MachineRecord;
  marksOnly?: boolean;
}) {
  const status = getGeratstatusValue(machine);
  if (!hasValue(status)) return null;

  return (
    <StatusIndicatorRow
      label="Status"
      variant={getGeratstatusVariant(status)}
      text={formatValue(status)}
      marksOnly={marksOnly}
    />
  );
}

function InternIndicator({
  value,
  marksOnly = false,
}: {
  value: unknown;
  marksOnly?: boolean;
}) {
  const expiry = parseDateOnly(value);
  if (!expiry) return null;

  const valid = isValidOnOrBefore(expiry);
  return (
    <StatusIndicatorRow
      label="Intern §11"
      variant={valid ? "valid" : "expired"}
      text={valid ? `bis ${formatDate(expiry)}` : "Abgelaufen"}
      marksOnly={marksOnly}
    />
  );
}

function ServiceIndicator({
  lastServiceDate,
  marksOnly = false,
}: {
  lastServiceDate: unknown;
  marksOnly?: boolean;
}) {
  const validUntil = getServiceValidUntil(lastServiceDate);
  if (!validUntil) return null;

  const valid = isValidOnOrBefore(validUntil);
  return (
    <StatusIndicatorRow
      label="Service"
      variant={valid ? "valid" : "expired"}
      text={valid ? `bis ${formatGermanMonthYear(validUntil)}` : "Fällig"}
      marksOnly={marksOnly}
    />
  );
}

function StatusIndicatorRow({
  label,
  variant,
  text,
  marksOnly = false,
}: {
  label: string;
  variant: "fertig" | "repair" | "valid" | "expired" | "default";
  text: string;
  marksOnly?: boolean;
}) {
  if (marksOnly) {
    return (
      <span
        className="machineStatusRow machineStatusRowMarksOnly"
        title={`${label}: ${text}`}
        aria-label={`${label}: ${text}`}
      >
        <span className={`machineStatusMark ${variant}`} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className="machineStatusRow">
      <span className={`machineStatusMark ${variant}`} aria-hidden="true" />
      <span className={`machineStatusBadge ${variant}`}>
        <strong className="machineStatusLabel">{label}</strong>
        <span className="machineStatusValue">{text}</span>
      </span>
    </span>
  );
}
