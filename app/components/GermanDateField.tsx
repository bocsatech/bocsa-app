"use client";

import { useId, useRef, useState } from "react";
import {
  DE_DATE_PLACEHOLDER,
  formatGermanDate,
  germanDateComparable,
} from "../../lib/dates";
import GermanDateCalendarPopover, {
  initialCalendarView,
} from "./GermanDateCalendarPopover";

type Props = {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  openPickerOnFocus?: boolean;
  pickerVariant?: "native" | "calendar";
  minYear?: number;
  maxYear?: number;
};

function CalendarIcon() {
  return (
    <svg
      className="dateFieldPickerIcon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5zm2 4h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zM7 16h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"
      />
    </svg>
  );
}

export default function GermanDateField({
  value,
  onChange,
  readOnly = false,
  disabled = false,
  placeholder,
  id,
  openPickerOnFocus = false,
  pickerVariant = "native",
  minYear,
  maxYear,
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const nativeRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const isoValue = germanDateComparable(value);
  const pickerDisabled = readOnly || disabled;
  const nowYear = new Date().getFullYear();
  const calendarMinYear = minYear ?? nowYear - 100;
  const calendarMaxYear = maxYear ?? nowYear;
  const initialView = initialCalendarView(value);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initialView.year);
  const [viewMonth, setViewMonth] = useState(initialView.month);

  function syncViewFromValue(nextValue: string) {
    const nextView = initialCalendarView(nextValue);
    setViewYear(nextView.year);
    setViewMonth(nextView.month);
  }

  function openNativePicker() {
    const el = nativeRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        /* Safari / ältere Browser */
      }
    }
    el.click();
  }

  function openPicker() {
    if (pickerDisabled) return;
    if (pickerVariant === "calendar") {
      syncViewFromValue(value);
      setCalendarOpen(true);
      return;
    }
    openNativePicker();
  }

  function handleSelectDay(day: number) {
    const date = new Date(viewYear, viewMonth - 1, day);
    onChange(formatGermanDate(date));
  }

  return (
    <div
      ref={rootRef}
      className={`dateFieldWithPicker${pickerDisabled ? " isDisabled" : ""}${
        pickerVariant === "calendar" ? " hasCalendarPopover" : ""
      }`}
    >
      <input
        type="text"
        id={inputId}
        className="dateFieldText"
        value={value}
        readOnly={readOnly}
        disabled={disabled}
        placeholder={placeholder ?? DE_DATE_PLACEHOLDER}
        inputMode="numeric"
        onChange={(event) => onChange(event.target.value)}
        onFocus={openPickerOnFocus ? openPicker : undefined}
        onClick={openPickerOnFocus ? openPicker : undefined}
      />
      {!pickerDisabled ? (
        <>
          <button
            type="button"
            className="dateFieldPickerBtn"
            onClick={openPicker}
            aria-label="Datum wählen"
            title="Datum wählen"
            aria-expanded={pickerVariant === "calendar" ? calendarOpen : undefined}
          >
            <CalendarIcon />
          </button>
          {pickerVariant === "calendar" ? (
            <GermanDateCalendarPopover
              open={calendarOpen}
              value={value}
              viewYear={viewYear}
              viewMonth={viewMonth}
              minYear={calendarMinYear}
              maxYear={calendarMaxYear}
              onClose={() => setCalendarOpen(false)}
              onViewChange={(year, month) => {
                setViewYear(year);
                setViewMonth(month);
              }}
              onSelectDay={handleSelectDay}
            />
          ) : (
            <input
              ref={nativeRef}
              type="date"
              className="dateFieldNativePicker"
              value={isoValue}
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                const next = event.target.value;
                onChange(next ? formatGermanDate(next) : "");
              }}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
