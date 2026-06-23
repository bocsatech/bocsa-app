"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildMonthSegments,
  buildTimelineDays,
  dateKeyFromDate,
  monthLabelAtScroll,
} from "../../lib/austria-holidays";

export const DAY_COLUMN_WIDTH = 40;

const TIMELINE_DAYS = 550;
const DAYS_BEFORE_TODAY = 120;

type UrlaubBlock = {
  startKey: string;
  endKey: string;
  label: string;
  variant: "urlaub" | "urlaub-plan" | "status";
};

type TimelineUser = {
  id: string;
  name: string;
  initials: string;
  blocks: UrlaubBlock[];
};

const DEMO_USERS: TimelineUser[] = [
  {
    id: "robert",
    name: "Robert Bocsa",
    initials: "RB",
    blocks: [
      { startKey: "2025-12-04", endKey: "2025-12-04", label: "Ur 4.", variant: "urlaub" },
      { startKey: "2025-12-08", endKey: "2025-12-08", label: "Ma", variant: "status" },
      { startKey: "2025-12-09", endKey: "2025-12-09", label: "Ch", variant: "status" },
      { startKey: "2025-12-10", endKey: "2025-12-10", label: "Er", variant: "status" },
      { startKey: "2025-12-15", endKey: "2025-12-18", label: "Urlaub 15.–18. Dez. 2025", variant: "urlaub-plan" },
      { startKey: "2025-12-22", endKey: "2025-12-23", label: "Urlaub 22.–23.", variant: "urlaub" },
      { startKey: "2025-12-29", endKey: "2025-12-29", label: "Zw", variant: "status" },
      { startKey: "2026-01-02", endKey: "2026-01-02", label: "Ne", variant: "status" },
    ],
  },
];

type Props = {
  anchorDate?: Date;
};

function blockStyle(block: UrlaubBlock, days: { dateKey: string }[]) {
  const start = days.findIndex((day) => day.dateKey === block.startKey);
  const end = days.findIndex((day) => day.dateKey === block.endKey);
  if (start < 0 || end < 0) return null;
  return {
    left: start * DAY_COLUMN_WIDTH + 4,
    width: (end - start + 1) * DAY_COLUMN_WIDTH - 8,
  };
}

export default function UrlaubHorizCalendar({ anchorDate }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleMonth, setVisibleMonth] = useState("");
  const anchor = anchorDate ?? new Date();
  const timelineStart = useMemo(() => {
    const start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - DAYS_BEFORE_TODAY);
    return start;
  }, [anchor]);

  const days = useMemo(
    () => buildTimelineDays(timelineStart, TIMELINE_DAYS, anchor),
    [anchor, timelineStart]
  );

  const todayIndex = days.findIndex((day) => day.isToday);
  const gridWidth = days.length * DAY_COLUMN_WIDTH;
  const monthSegments = useMemo(
    () => buildMonthSegments(days, DAY_COLUMN_WIDTH),
    [days]
  );

  const syncVisibleMonth = useCallback(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    setVisibleMonth(monthLabelAtScroll(days, viewport.scrollLeft, DAY_COLUMN_WIDTH));
  }, [days]);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport || todayIndex < 0) return;
    viewport.scrollLeft = Math.max(0, todayIndex * DAY_COLUMN_WIDTH - viewport.clientWidth * 0.35);
    syncVisibleMonth();
  }, [todayIndex, syncVisibleMonth]);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    viewport.addEventListener("scroll", syncVisibleMonth, { passive: true });
    syncVisibleMonth();
    return () => viewport.removeEventListener("scroll", syncVisibleMonth);
  }, [syncVisibleMonth]);

  return (
    <section className="urlaubTimelineWrap" aria-label="Urlaubskalender Österreich">
      <div className="urlaubCalToolbar">
        <div className="urlaubCalToolbarRight">
          <span className="urlaubMonthIndicator" aria-live="polite">
            Sichtbar: <strong>{visibleMonth || "—"}</strong>
          </span>
          <div className="urlaubCalLegend" aria-hidden="true">
          <span className="urlaubCalLegendItem">
            <span className="urlaubCalLegendSwatch weekend" /> Sa / So
          </span>
          <span className="urlaubCalLegendItem">
            <span className="urlaubCalLegendSwatch holiday" /> Feiertag
          </span>
          <span className="urlaubCalLegendItem">
            <span className="urlaubCalLegendSwatch urlaub" /> Urlaub
          </span>
          </div>
        </div>
      </div>

      <div className="urlaubTimeline">
        <div className="urlaubTimelineUsersHead">
          <span>Mitarbeiter</span>
        </div>

        <div className="urlaubTimelineUsers">
          {DEMO_USERS.map((user) => (
            <div key={user.id} className="urlaubUserCell">
              <span className="urlaubUserAvatar" aria-hidden="true">
                {user.initials}
              </span>
              <span className="urlaubUserName">{user.name}</span>
            </div>
          ))}
        </div>

        <div className="urlaubTimelineMain">
          <div className="urlaubTimelineScroll" ref={scrollRef}>
            <div className="urlaubTimelineGrid" style={{ width: gridWidth }}>
              <div className="urlaubTimelineHeader">
                <div className="urlaubTimelineHeaderRow urlaubTimelineHeaderMonths">
                  {monthSegments.map((segment) => (
                    <div
                      key={`${segment.year}-${segment.monthIndex}`}
                      className="urlaubMonthSegment"
                      style={{ width: segment.widthPx }}
                      title={segment.label}
                    >
                      {segment.label}
                    </div>
                  ))}
                </div>
                <div className="urlaubTimelineHeaderRow">
                  {days.map((day) => (
                    <div
                      key={`wd-${day.dateKey}`}
                      className={[
                        "urlaubDayCol",
                        "urlaubDayColHead",
                        day.isWeekend ? "weekend" : "",
                        day.holiday ? "holiday" : "",
                        day.isToday ? "today" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {day.weekdayLabel}
                    </div>
                  ))}
                </div>
                <div className="urlaubTimelineHeaderRow">
                  {days.map((day) => (
                    <div
                      key={`d-${day.dateKey}`}
                      className={[
                        "urlaubDayCol",
                        "urlaubDayColHead",
                        day.isWeekend ? "weekend" : "",
                        day.holiday ? "holiday" : "",
                        day.isToday ? "today" : "",
                        day.isMonthStart ? "monthStart" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      title={day.holiday?.label}
                    >
                      {day.day}
                    </div>
                  ))}
                </div>
                <div className="urlaubTimelineHeaderRow urlaubTimelineHeaderWeeks">
                  {days.map((day) => (
                    <div
                      key={`w-${day.dateKey}`}
                      className={[
                        "urlaubDayCol",
                        "urlaubDayColHead",
                        "urlaubDayColWeek",
                        day.isWeekend ? "weekend" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {day.isMonday ? `Woche ${day.isoWeek}` : ""}
                    </div>
                  ))}
                </div>
              </div>

              {DEMO_USERS.map((user) => (
                <div key={user.id} className="urlaubTimelineRow" style={{ width: gridWidth }}>
                  {days.map((day) => (
                    <div
                      key={`bg-${user.id}-${day.dateKey}`}
                      className={[
                        "urlaubDayCol",
                        "urlaubDayColBody",
                        day.isWeekend ? "weekend" : "",
                        day.holiday ? "holiday" : "",
                        day.isToday ? "today" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />
                  ))}
                  {user.blocks.map((block) => {
                    const pos = blockStyle(block, days);
                    if (!pos) return null;
                    return (
                      <div
                        key={`${user.id}-${block.startKey}-${block.label}`}
                        className={`urlaubBlock urlaubBlock--${block.variant}`}
                        style={{ left: pos.left, width: pos.width }}
                        title={block.label}
                      >
                        {block.label}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function urlaubCalendarTodayKey() {
  return dateKeyFromDate(new Date());
}
