"use client";

import { useId, useMemo } from "react";
import { useLocalhostPickerVariant } from "../../lib/use-localhost-picker-variant";
import GermanDateCalendarCombo from "./GermanDateCalendarCombo";

const DE_MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  minYear?: number;
  maxYear?: number;
  pickerVariant?: "native" | "calendar";
};

function parseIsoMonth(value: string) {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

export default function GermanMonthField({
  value,
  onChange,
  disabled = false,
  id,
  minYear,
  maxYear,
  pickerVariant,
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const nowYear = new Date().getFullYear();
  const calendarMinYear = minYear ?? nowYear - 5;
  const calendarMaxYear = maxYear ?? nowYear + 5;
  const resolvedVariant = useLocalhostPickerVariant(pickerVariant);

  const parsed = parseIsoMonth(value);
  const viewYear = parsed?.year ?? nowYear;
  const viewMonth = parsed?.month ?? new Date().getMonth() + 1;

  const years = useMemo(() => {
    const list: number[] = [];
    for (let year = calendarMaxYear; year >= calendarMinYear; year -= 1) list.push(year);
    return list;
  }, [calendarMinYear, calendarMaxYear]);

  if (resolvedVariant === "native") {
    return (
      <input
        id={inputId}
        type="month"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <div className="germanMonthField">
      <GermanDateCalendarCombo
        id={inputId}
        ariaLabel="Monat"
        value={viewMonth}
        disabled={disabled}
        options={DE_MONTHS.map((label, index) => ({ value: index + 1, label }))}
        onChange={(month) => onChange(`${viewYear}-${String(month).padStart(2, "0")}`)}
      />
      <GermanDateCalendarCombo
        ariaLabel="Jahr"
        value={viewYear}
        disabled={disabled}
        options={years.map((year) => ({ value: year, label: String(year) }))}
        onChange={(year) => onChange(`${year}-${String(viewMonth).padStart(2, "0")}`)}
      />
    </div>
  );
}
