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
};

export default function MachineStatusIndicators({
  machine,
  className = "",
  fixedSlots = false,
}: Props) {
  const geratstatus = <GeratstatusIndicator machine={machine} />;
  const intern = <InternIndicator value={getInternExpiryValue(machine)} />;
  const service = <ServiceIndicator lastServiceDate={getLastServiceDateValue(machine)} />;

  if (!fixedSlots) {
    return (
      <div className={`machineStatusIndicators ${className}`.trim()}>
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
          {slot.node ?? <span className="machineStatusSlotEmpty" aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}

function GeratstatusIndicator({ machine }: { machine: MachineRecord }) {
  const status = getGeratstatusValue(machine);
  if (!hasValue(status)) return null;

  return (
    <StatusIndicatorRow
      label="Status"
      variant={getGeratstatusVariant(status)}
      text={formatValue(status)}
    />
  );
}

function InternIndicator({ value }: { value: unknown }) {
  const expiry = parseDateOnly(value);
  if (!expiry) return null;

  const valid = isValidOnOrBefore(expiry);
  return (
    <StatusIndicatorRow
      label="Intern §11"
      variant={valid ? "valid" : "expired"}
      text={valid ? `bis ${formatDate(expiry)}` : "Abgelaufen"}
    />
  );
}

function ServiceIndicator({ lastServiceDate }: { lastServiceDate: unknown }) {
  const validUntil = getServiceValidUntil(lastServiceDate);
  if (!validUntil) return null;

  const valid = isValidOnOrBefore(validUntil);
  return (
    <StatusIndicatorRow
      label="Service"
      variant={valid ? "valid" : "expired"}
      text={valid ? `bis ${formatGermanMonthYear(validUntil)}` : "Fällig"}
    />
  );
}

function StatusIndicatorRow({
  label,
  variant,
  text,
}: {
  label: string;
  variant: "fertig" | "repair" | "valid" | "expired" | "default";
  text: string;
}) {
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
