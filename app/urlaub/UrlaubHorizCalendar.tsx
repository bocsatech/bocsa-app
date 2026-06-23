"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  WEEKDAY_LABELS_AT,
  buildCalendarMonths,
  dateKeyFromDate,
} from "../../lib/austria-holidays";

const MONTHS_TO_RENDER = 36;
const MONTHS_BEFORE_ANCHOR = 12;

type Props = {
  anchorDate?: Date;
};

export default function UrlaubHorizCalendar({ anchorDate }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const anchor = anchorDate ?? new Date();
  const anchorYear = anchor.getFullYear();
  const anchorMonth = anchor.getMonth();

  const startYear = anchorYear + Math.floor((anchorMonth - MONTHS_BEFORE_ANCHOR) / 12);
  const startMonth = ((anchorMonth - MONTHS_BEFORE_ANCHOR) % 12 + 12) % 12;

  const months = useMemo(
    () => buildCalendarMonths(startYear, startMonth, MONTHS_TO_RENDER, anchor),
    [anchor, anchorMonth, anchorYear, startMonth, startYear]
  );

  const anchorMonthIndex = MONTHS_BEFORE_ANCHOR;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const monthEl = viewport.querySelector<HTMLElement>(
      `[data-month-index="${anchorMonthIndex}"]`
    );
    if (!monthEl) return;

    viewport.scrollLeft = monthEl.offsetLeft;
  }, [anchorMonthIndex]);

  return (
    <section className="urlaubCalWrap" aria-label="Urlaubskalender Österreich">
      <div className="urlaubCalToolbar">
        <p className="urlaubCalToolbarHint">
          Horizontal scrollen — ein Monat pro Ansicht, frei vor und zurück.
        </p>
        <div className="urlaubCalLegend" aria-hidden="true">
          <span className="urlaubCalLegendItem">
            <span className="urlaubCalLegendSwatch weekend" /> Sa / So
          </span>
          <span className="urlaubCalLegendItem">
            <span className="urlaubCalLegendSwatch holiday" /> Feiertag
          </span>
          <span className="urlaubCalLegendItem">
            <span className="urlaubCalLegendSwatch today" /> Heute
          </span>
        </div>
      </div>

      <div className="urlaubCalViewport" ref={viewportRef}>
        {months.map((month, monthIndex) => (
          <article
            key={`${month.year}-${month.monthIndex}`}
            className="urlaubCalMonth"
            data-month-index={monthIndex}
            aria-label={month.label}
          >
              <h2 className="urlaubCalMonthTitle">{month.label}</h2>
              <div className="urlaubCalWeekdays">
                {WEEKDAY_LABELS_AT.map((label) => (
                  <span key={label} className="urlaubCalWeekday">
                    {label}
                  </span>
                ))}
              </div>
              {month.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="urlaubCalWeek">
                  {week.map((cell, dayIndex) =>
                    cell ? (
                      <div
                        key={cell.dateKey}
                        className={[
                          "urlaubCalDay",
                          cell.isWeekend ? "weekend" : "",
                          cell.holiday ? "holiday" : "",
                          cell.isToday ? "today" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        title={
                          cell.holiday
                            ? `${cell.day}. ${month.label}: ${cell.holiday.label}`
                            : `${cell.day}. ${month.label}`
                        }
                      >
                        <span className="urlaubCalDayNum">{cell.day}</span>
                        {cell.holiday ? (
                          <span className="urlaubCalHoliday">{cell.holiday.label}</span>
                        ) : null}
                      </div>
                    ) : (
                      <div key={`empty-${weekIndex}-${dayIndex}`} className="urlaubCalDayEmpty" />
                    )
                  )}
                </div>
              ))}
            </article>
        ))}
      </div>
    </section>
  );
}

export function urlaubCalendarTodayKey() {
  return dateKeyFromDate(new Date());
}
