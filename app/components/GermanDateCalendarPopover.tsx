"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatGermanDate, parseGermanDate } from "../../lib/dates";

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

const DE_WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

type PopoverPosition = {
  top: number;
  left: number;
};

type Props = {
  open: boolean;
  value: string;
  viewYear: number;
  viewMonth: number;
  minYear: number;
  maxYear: number;
  anchorRef?: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onViewChange: (year: number, month: number) => void;
  onSelectDay: (day: number) => void;
};

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function mondayBasedOffset(year: number, month: number) {
  const weekday = new Date(year, month - 1, 1).getDay();
  return weekday === 0 ? 6 : weekday - 1;
}

function computePopoverPosition(
  anchor: HTMLElement,
  popover: HTMLElement | null
): PopoverPosition {
  const rect = anchor.getBoundingClientRect();
  const width = popover?.offsetWidth ?? 288;
  const height = popover?.offsetHeight ?? 320;
  let left = rect.right - width;
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  let top = rect.bottom + 8;
  if (top + height > window.innerHeight - 8 && rect.top > height + 16) {
    top = Math.max(8, rect.top - height - 8);
  }
  return { top, left };
}

export default function GermanDateCalendarPopover({
  open,
  value,
  viewYear,
  viewMonth,
  minYear,
  maxYear,
  anchorRef,
  onClose,
  onViewChange,
  onSelectDay,
}: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const usePortal = Boolean(anchorRef);
  const parsed = parseGermanDate(value);
  const selectedDay =
    parsed &&
    parsed.getFullYear() === viewYear &&
    parsed.getMonth() + 1 === viewMonth
      ? parsed.getDate()
      : null;

  const years = useMemo(() => {
    const list: number[] = [];
    for (let year = maxYear; year >= minYear; year -= 1) list.push(year);
    return list;
  }, [minYear, maxYear]);

  const monthCells = useMemo(() => {
    const totalDays = daysInMonth(viewYear, viewMonth);
    const leading = mondayBasedOffset(viewYear, viewMonth);
    const cells: Array<number | null> = [];
    for (let i = 0; i < leading; i += 1) cells.push(null);
    for (let day = 1; day <= totalDays; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const updatePosition = useCallback(() => {
    if (!open || !anchorRef?.current) {
      setPosition(null);
      return;
    }
    setPosition(computePopoverPosition(anchorRef.current, popoverRef.current));
  }, [anchorRef, open]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition, viewYear, viewMonth]);

  useEffect(() => {
    if (!open || !usePortal) return;
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition, usePortal]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorRef, onClose, open]);

  if (!open) return null;

  const popover = (
    <div
      ref={popoverRef}
      className={`germanDateCalendarPopover${usePortal ? " isPortaled" : ""}`}
      style={usePortal && position ? { top: position.top, left: position.left } : undefined}
      role="dialog"
      aria-label="Datum wählen"
    >
      <div className="germanDateCalendarNav">
        <label className="germanDateCalendarSelectField">
          <span className="srOnly">Monat</span>
          <select
            value={viewMonth}
            onChange={(event) => onViewChange(viewYear, Number(event.target.value))}
          >
            {DE_MONTHS.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="germanDateCalendarSelectField">
          <span className="srOnly">Jahr</span>
          <select
            value={viewYear}
            onChange={(event) => onViewChange(Number(event.target.value), viewMonth)}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="germanDateCalendarWeekdays" aria-hidden>
        {DE_WEEKDAYS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="germanDateCalendarGrid">
        {monthCells.map((day, index) =>
          day === null ? (
            <span key={`empty-${index}`} className="germanDateCalendarDay isEmpty" aria-hidden />
          ) : (
            <button
              key={day}
              type="button"
              className={`germanDateCalendarDay${selectedDay === day ? " isSelected" : ""}`}
              onClick={() => {
                onSelectDay(day);
                onClose();
              }}
            >
              {day}
            </button>
          )
        )}
      </div>

      {parsed ? (
        <p className="germanDateCalendarHint">Gewählt: {formatGermanDate(parsed)}</p>
      ) : null}
    </div>
  );

  if (usePortal && typeof document !== "undefined") {
    return createPortal(popover, document.body);
  }

  return popover;
}

export function initialCalendarView(value: string) {
  const parsed = parseGermanDate(value);
  const anchor = parsed ?? new Date();
  return {
    year: anchor.getFullYear(),
    month: anchor.getMonth() + 1,
  };
}
