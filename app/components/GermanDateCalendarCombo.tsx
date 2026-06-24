"use client";

import { useEffect, useId, useRef, useState } from "react";

export type GermanDateCalendarComboOption = {
  value: number;
  label: string;
};

type Props = {
  value: number;
  options: GermanDateCalendarComboOption[];
  onChange: (value: number) => void;
  ariaLabel: string;
  disabled?: boolean;
  id?: string;
};

export default function GermanDateCalendarCombo({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  id,
}: Props) {
  const autoId = useId();
  const comboId = id ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={`germanDateCalendarCombo${open ? " isOpen" : ""}`}>
      <button
        type="button"
        id={comboId}
        className="germanDateCalendarComboTrigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label ?? "—"}</span>
        <span className="germanDateCalendarComboChevron" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <ul className="germanDateCalendarComboList" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={option.value === value ? "isSelected" : undefined}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
