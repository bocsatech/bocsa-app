"use client";

import { useId, useRef } from "react";
import {
  DE_DATE_PLACEHOLDER,
  formatGermanDate,
  germanDateComparable,
} from "../../lib/dates";

type Props = {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
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
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const nativeRef = useRef<HTMLInputElement>(null);
  const isoValue = germanDateComparable(value);
  const pickerDisabled = readOnly || disabled;

  function openPicker() {
    if (pickerDisabled) return;
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

  return (
    <div className={`dateFieldWithPicker${pickerDisabled ? " isDisabled" : ""}`}>
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
      />
      {!pickerDisabled ? (
        <>
          <button
            type="button"
            className="dateFieldPickerBtn"
            onClick={openPicker}
            aria-label="Datum wählen"
            title="Datum wählen"
          >
            <CalendarIcon />
          </button>
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
        </>
      ) : null}
    </div>
  );
}
