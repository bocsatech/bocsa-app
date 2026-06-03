"use client";

import { formatGermanDate } from "../../lib/dates";
import { BUCHUNG_STATUS_LABELS } from "../../lib/pkw";
import {
  getLastPkwBuchung,
  getPkwParagraf57aValue,
  hasPkwValue,
  isPkwDateValidOnOrBefore,
} from "../../lib/pkw-status";
import type { PkwBuchung, PkwFahrzeug } from "../../lib/types/pkw";

type Props = {
  fahrzeug: PkwFahrzeug;
  buchungenByFahrzeug?: Map<string, PkwBuchung[]>;
  className?: string;
  fixedSlots?: boolean;
};

export default function PkwStatusIndicators({
  fahrzeug,
  buchungenByFahrzeug,
  className = "",
  fixedSlots = false,
}: Props) {
  const paragraf57a = <Paragraf57aIndicator value={getPkwParagraf57aValue(fahrzeug)} />;
  const aktiv = <AktivIndicator aktiv={fahrzeug.aktiv !== false} />;
  const service = (
    <ServiceIndicator buchung={getLastPkwBuchung(fahrzeug.id, buchungenByFahrzeug ?? new Map())} />
  );

  if (!fixedSlots) {
    return (
      <div className={`machineStatusIndicators ${className}`.trim()}>
        {aktiv}
        {paragraf57a}
        {service}
      </div>
    );
  }

  const slots = [
    { key: "aktiv", node: aktiv },
    { key: "paragraf57a", node: paragraf57a },
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

function AktivIndicator({ aktiv }: { aktiv: boolean }) {
  return (
    <StatusIndicatorRow
      label="Status"
      variant={aktiv ? "fertig" : "expired"}
      text={aktiv ? "Aktiv" : "Inaktiv"}
    />
  );
}

function Paragraf57aIndicator({ value }: { value: string }) {
  if (!hasPkwValue(value)) return null;
  const valid = isPkwDateValidOnOrBefore(value);
  return (
    <StatusIndicatorRow
      label="§57a"
      variant={valid ? "valid" : "expired"}
      text={valid ? `bis ${formatGermanDate(value)}` : "Abgelaufen"}
    />
  );
}

function ServiceIndicator({ buchung }: { buchung: PkwBuchung | null }) {
  if (!buchung) return null;
  const label = BUCHUNG_STATUS_LABELS[buchung.status] ?? buchung.status;
  const variant =
    buchung.status === "fertig"
      ? "valid"
      : buchung.status === "abgesagt"
        ? "expired"
        : "repair";
  const date = formatGermanDate(buchung.slot_start) || "—";
  return (
    <StatusIndicatorRow label="Termin" variant={variant} text={`${label} · ${date}`} />
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
