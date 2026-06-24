"use client";

import { GERAETSTATUS_OPTIONS } from "../../lib/geraetstatus";
import { stammdatenStatusClassName } from "../../lib/machines";

type Props = {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  id?: string;
};

export default function GeraetstatusSelect({
  value,
  onChange,
  readOnly = false,
  className = "",
  id,
}: Props) {
  const statusClass = stammdatenStatusClassName(value);

  if (readOnly) {
    return (
      <strong className={`geraetstatusValue ${statusClass} ${className}`.trim()}>
        {value.trim() || "—"}
      </strong>
    );
  }

  return (
    <select
      id={id}
      className={`statusSelect ${statusClass} ${className}`.trim()}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    >
      <option value="">Gerätstatus</option>
      {GERAETSTATUS_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
