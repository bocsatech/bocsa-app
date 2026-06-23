"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildMonthSegments,
  buildTimelineDays,
  dateKeyFromDate,
  monthLabelAtScroll,
  scrollIndexForMonthOffset,
  scrollIndexForWeekOffset,
  visibleDayIndexAtScroll,
} from "../../lib/austria-holidays";
import { isDateMarkedUrlaub, toggleUrlaubDay } from "../../lib/urlaub-blocks";
import {
  mapDbUsersToUrlaubTimelineUsers,
  type UrlaubBlock,
  type UrlaubTimelineUser,
} from "../../lib/urlaub-timeline-users";

export const DAY_COLUMN_WIDTH = 40;

const TIMELINE_DAYS = 550;
const DAYS_BEFORE_TODAY = 120;

type Props = {
  initialUsers?: UrlaubTimelineUser[];
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

export default function UrlaubHorizCalendar({ initialUsers = [], anchorDate }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const usersColRef = useRef<HTMLDivElement>(null);
  const syncingScrollRef = useRef(false);
  const [users, setUsers] = useState<UrlaubTimelineUser[]>(initialUsers);
  const [visibleMonth, setVisibleMonth] = useState("");
  const [sessionUsername, setSessionUsername] = useState("");
  const [editMode, setEditMode] = useState(false);
  const anchor = anchorDate ?? new Date();

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const name = payload?.user?.username ?? payload?.username ?? "";
        if (typeof name === "string") setSessionUsername(name.trim());
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (initialUsers.length > 0) return;

    fetch("/api/urlaub/benutzer", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const rows = Array.isArray(payload?.users) ? payload.users : [];
        if (rows.length === 0) return;
        setUsers(
          rows.map((user: UrlaubTimelineUser) => ({
            username: user.username,
            displayName: user.displayName,
            initials: user.initials,
            blocks: user.blocks ?? [],
          }))
        );
      })
      .catch(() => undefined);
  }, [initialUsers.length]);

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

  const scrollToDayIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const viewport = scrollRef.current;
      if (!viewport || index < 0) return;
      const left = Math.max(0, index * DAY_COLUMN_WIDTH - viewport.clientWidth * 0.08);
      viewport.scrollTo({ left, behavior });
      if (behavior === "auto") syncVisibleMonth();
    },
    [syncVisibleMonth]
  );

  const scrollByWeek = useCallback(
    (direction: -1 | 1) => {
      const viewport = scrollRef.current;
      if (!viewport) return;
      const fromIndex = visibleDayIndexAtScroll(
        days,
        viewport.scrollLeft,
        DAY_COLUMN_WIDTH,
        viewport.clientWidth
      );
      scrollToDayIndex(scrollIndexForWeekOffset(fromIndex, direction, days.length));
    },
    [days, scrollToDayIndex]
  );

  const scrollByMonth = useCallback(
    (direction: -1 | 1) => {
      const viewport = scrollRef.current;
      if (!viewport) return;
      const fromIndex = visibleDayIndexAtScroll(
        days,
        viewport.scrollLeft,
        DAY_COLUMN_WIDTH,
        viewport.clientWidth
      );
      scrollToDayIndex(scrollIndexForMonthOffset(days, fromIndex, direction));
    },
    [days, scrollToDayIndex]
  );

  useEffect(() => {
    const viewport = scrollRef.current;
    const usersCol = usersColRef.current;
    if (!viewport || !usersCol) return;

    const syncFromTimeline = () => {
      if (syncingScrollRef.current) return;
      syncingScrollRef.current = true;
      usersCol.scrollTop = viewport.scrollTop;
      syncingScrollRef.current = false;
    };

    const syncFromUsers = () => {
      if (syncingScrollRef.current) return;
      syncingScrollRef.current = true;
      viewport.scrollTop = usersCol.scrollTop;
      syncingScrollRef.current = false;
    };

    viewport.addEventListener("scroll", syncFromTimeline, { passive: true });
    usersCol.addEventListener("scroll", syncFromUsers, { passive: true });
    return () => {
      viewport.removeEventListener("scroll", syncFromTimeline);
      usersCol.removeEventListener("scroll", syncFromUsers);
    };
  }, [users.length]);

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

  const handleToggleEdit = () => {
    setEditMode((current) => !current);
  };

  const handleDayClick = (username: string, dateKey: string) => {
    if (!editMode || username !== sessionUsername) return;
    setUsers((current) =>
      current.map((user) =>
        user.username === username
          ? { ...user, blocks: toggleUrlaubDay(user.blocks, dateKey, days) }
          : user
      )
    );
  };

  if (users.length === 0) {
    return (
      <section className="urlaubTimelineWrap">
        <p className="urlaubEmpty">Keine Mitarbeiter geladen.</p>
      </section>
    );
  }

  return (
    <section className="urlaubTimelineWrap" aria-label="Urlaubskalender Österreich">
      <div className="urlaubCalToolbar">
        <div className="urlaubCalToolbarNav">
          <button type="button" className="urlaubNavBtn" onClick={() => scrollByWeek(-1)}>
            ← Letzte Woche
          </button>
          <button type="button" className="urlaubNavBtn" onClick={() => scrollByMonth(-1)}>
            ← Letzter Monat
          </button>
          <span className="urlaubMonthIndicator" aria-live="polite">
            {visibleMonth || "—"}
          </span>
          <button type="button" className="urlaubNavBtn" onClick={() => scrollByMonth(1)}>
            Nächster Monat →
          </button>
          <button type="button" className="urlaubNavBtn" onClick={() => scrollByWeek(1)}>
            Nächste Woche →
          </button>
        </div>

        <div className="urlaubCalToolbarRight">
          <button
            type="button"
            className={`urlaubEditBtn${editMode ? " urlaubEditBtn--active" : ""}`}
            onClick={handleToggleEdit}
            disabled={!sessionUsername}
            title={
              sessionUsername
                ? editMode
                  ? "Bearbeitung beenden"
                  : "Eigene Urlaubstage bearbeiten"
                : "Anmeldung erforderlich"
            }
          >
            {editMode ? "Fertig" : "Bearbeitung"}
          </button>
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

      {editMode && sessionUsername ? (
        <p className="urlaubEditHint">
          Bearbeitungsmodus: Klicken Sie auf Tage in Ihrer Zeile, um Urlaub zu setzen oder zu entfernen.
        </p>
      ) : null}

      <div className="urlaubTimeline">
        <div className="urlaubTimelineUsersHead">
          <span>Mitarbeiter</span>
        </div>

        <div className="urlaubTimelineUsers" ref={usersColRef}>
          {users.map((user) => (
            <div
              key={user.username}
              className={[
                "urlaubUserCell",
                editMode && user.username === sessionUsername ? "urlaubUserCell--editable" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="urlaubUserAvatar" aria-hidden="true">
                {user.initials}
              </span>
              <span className="urlaubUserName">{user.displayName}</span>
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

              {users.map((user) => {
                const isEditable = editMode && user.username === sessionUsername;
                return (
                  <div
                    key={user.username}
                    className={[
                      "urlaubTimelineRow",
                      isEditable ? "urlaubTimelineRow--editable" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{ width: gridWidth }}
                  >
                    {days.map((day) => {
                      const marked = isDateMarkedUrlaub(user.blocks, day.dateKey, days);
                      return (
                        <div
                          key={`bg-${user.username}-${day.dateKey}`}
                          className={[
                            "urlaubDayCol",
                            "urlaubDayColBody",
                            day.isWeekend ? "weekend" : "",
                            day.holiday ? "holiday" : "",
                            day.isToday ? "today" : "",
                            isEditable ? "urlaubDayColBody--clickable" : "",
                            marked ? "urlaubDayColBody--marked" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={isEditable ? () => handleDayClick(user.username, day.dateKey) : undefined}
                          onKeyDown={
                            isEditable
                              ? (event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    handleDayClick(user.username, day.dateKey);
                                  }
                                }
                              : undefined
                          }
                          role={isEditable ? "button" : undefined}
                          tabIndex={isEditable ? 0 : undefined}
                          aria-label={
                            isEditable ? `${day.dateKey}${marked ? ", Urlaub" : ""}` : undefined
                          }
                        />
                      );
                    })}
                    {user.blocks.map((block) => {
                      const pos = blockStyle(block, days);
                      if (!pos) return null;
                      return (
                        <div
                          key={`${user.username}-${block.startKey}-${block.label}`}
                          className={`urlaubBlock urlaubBlock--${block.variant}`}
                          style={{ left: pos.left, width: pos.width }}
                          title={block.label}
                        >
                          {block.label}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
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
