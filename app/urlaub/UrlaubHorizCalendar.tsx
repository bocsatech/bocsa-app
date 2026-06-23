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
import {
  applyVariantToDateKeys,
  countUrlaubDaysInYear,
  dateKeyAtIndex,
  dateKeysInInclusiveRange,
  extendSelectionWithRange,
  indexFromPointer,
  removeDateKeysFromBlocks,
  toggleUrlaubDay,
  variantForDate,
} from "../../lib/urlaub-blocks";
import {
  ANNUAL_URLAUB_DAYS,
  ABSENCE_VARIANT_LABELS,
  CONTEXT_MENU_VARIANTS,
  type UrlaubBlock,
  type UrlaubBlockVariant,
  type UrlaubTimelineUser,
} from "../../lib/urlaub-timeline-users";

export const DAY_COLUMN_WIDTH = 40;

const TIMELINE_DAYS = 730;
const DAYS_BEFORE_TODAY = 180;

type Props = {
  initialUsers?: UrlaubTimelineUser[];
  anchorDate?: Date;
};

type ContextMenuState = {
  x: number;
  y: number;
} | null;

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
  const initialScrollDoneRef = useRef(false);
  const dragActiveRef = useRef(false);
  const rangeAnchorRef = useRef<string | null>(null);
  const editableRowRef = useRef<HTMLDivElement>(null);
  const clickTimerRef = useRef<number | null>(null);

  const [users, setUsers] = useState<UrlaubTimelineUser[]>(initialUsers);
  const [visibleMonth, setVisibleMonth] = useState("");
  const [sessionUsername, setSessionUsername] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [dragPreviewKeys, setDragPreviewKeys] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const anchor = anchorDate ?? new Date();
  const calendarYear = anchor.getFullYear();

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

  const currentUser = useMemo(
    () => users.find((user) => user.username === sessionUsername) ?? null,
    [sessionUsername, users]
  );

  const urlaubDaysUsed = useMemo(
    () => (currentUser ? countUrlaubDaysInYear(currentUser.blocks, days, calendarYear) : 0),
    [calendarYear, currentUser, days]
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

  const updateCurrentUserBlocks = useCallback(
    (updater: (blocks: UrlaubBlock[]) => UrlaubBlock[]) => {
      if (!sessionUsername) return;
      setUsers((current) =>
        current.map((user) =>
          user.username === sessionUsername ? { ...user, blocks: updater(user.blocks) } : user
        )
      );
    },
    [sessionUsername]
  );

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
    setDragPreviewKeys(new Set());
    rangeAnchorRef.current = null;
    dragActiveRef.current = false;
  }, []);

  const applyVariantToSelection = useCallback(
    (variant: UrlaubBlockVariant) => {
      if (selectedKeys.size === 0) return;
      updateCurrentUserBlocks((blocks) =>
        applyVariantToDateKeys(blocks, [...selectedKeys], variant, days)
      );
      clearSelection();
      setContextMenu(null);
    },
    [clearSelection, days, selectedKeys, updateCurrentUserBlocks]
  );

  const deleteSelection = useCallback(() => {
    if (selectedKeys.size === 0) return;
    updateCurrentUserBlocks((blocks) => removeDateKeysFromBlocks(blocks, selectedKeys, days));
    clearSelection();
    setContextMenu(null);
  }, [clearSelection, days, selectedKeys, updateCurrentUserBlocks]);

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
    if (!viewport || todayIndex < 0 || initialScrollDoneRef.current) return;
    initialScrollDoneRef.current = true;
    viewport.scrollLeft = Math.max(0, todayIndex * DAY_COLUMN_WIDTH - viewport.clientWidth * 0.35);
    setVisibleMonth(monthLabelAtScroll(days, viewport.scrollLeft, DAY_COLUMN_WIDTH));
  }, [days, todayIndex]);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    viewport.addEventListener("scroll", syncVisibleMonth, { passive: true });
    syncVisibleMonth();
    return () => viewport.removeEventListener("scroll", syncVisibleMonth);
  }, [syncVisibleMonth]);

  useEffect(() => {
    if (!editMode) clearSelection();
  }, [clearSelection, editMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!editMode || selectedKeys.size === 0) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelection();
      }
      if (event.key === "Escape") {
        clearSelection();
        setContextMenu(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearSelection, deleteSelection, editMode, selectedKeys.size]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, []);

  const handleToggleEdit = () => {
    setEditMode((current) => !current);
    setContextMenu(null);
  };

  const handleDayClick = (dateKey: string) => {
    if (!editMode || !sessionUsername) return;
    if (dragActiveRef.current) return;

    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
    }
    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null;
      if (dragActiveRef.current) return;
      updateCurrentUserBlocks((blocks) => toggleUrlaubDay(blocks, dateKey, days));
      clearSelection();
    }, 220);
  };

  const handleDayDoubleClick = (dateKey: string) => {
    if (!editMode || !sessionUsername) return;
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    const anchorKey = rangeAnchorRef.current;
    if (anchorKey && anchorKey !== dateKey) {
      setSelectedKeys(new Set(dateKeysInInclusiveRange(anchorKey, dateKey, days)));
    } else {
      setSelectedKeys(new Set([dateKey]));
    }
    rangeAnchorRef.current = dateKey;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>, dateKey: string) => {
    if (!editMode || !sessionUsername || event.button !== 0) return;
    if ((event.target as HTMLElement).closest(".urlaubBlock")) return;

    dragActiveRef.current = false;
    rangeAnchorRef.current = dateKey;
    const row = editableRowRef.current;
    const viewport = scrollRef.current;
    if (!row || !viewport) return;

    const startIndex = indexFromPointer(
      event.clientX,
      row.getBoundingClientRect().left,
      viewport.scrollLeft
    );
    const startKey = dateKeyAtIndex(days, startIndex) ?? dateKey;
    rangeAnchorRef.current = startKey;
    setDragPreviewKeys(new Set([startKey]));

    const onMove = (moveEvent: PointerEvent) => {
      dragActiveRef.current = true;
      const endIndex = indexFromPointer(
        moveEvent.clientX,
        row.getBoundingClientRect().left,
        viewport.scrollLeft
      );
      const endKey = dateKeyAtIndex(days, endIndex);
      if (!endKey || !rangeAnchorRef.current) return;
      setDragPreviewKeys(
        new Set(dateKeysInInclusiveRange(rangeAnchorRef.current, endKey, days))
      );
    };

    const onUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);

      if (dragActiveRef.current && rangeAnchorRef.current) {
        const endIndex = indexFromPointer(
          upEvent.clientX,
          row.getBoundingClientRect().left,
          viewport.scrollLeft
        );
        const endKey = dateKeyAtIndex(days, endIndex);
        if (endKey) {
          setSelectedKeys(
            new Set(dateKeysInInclusiveRange(rangeAnchorRef.current, endKey, days))
          );
        }
        setDragPreviewKeys(new Set());
        rangeAnchorRef.current = null;
        window.setTimeout(() => {
          dragActiveRef.current = false;
        }, 0);
        return;
      }

      setDragPreviewKeys(new Set());
      dragActiveRef.current = false;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleContextMenu = (event: React.MouseEvent, dateKey: string) => {
    if (!editMode || !sessionUsername) return;
    event.preventDefault();

    let keys = selectedKeys;
    if (keys.size === 0) {
      keys = new Set([dateKey]);
      setSelectedKeys(keys);
    } else if (!keys.has(dateKey)) {
      keys = extendSelectionWithRange(keys, dateKey, dateKey, days);
      setSelectedKeys(keys);
    }

    setContextMenu({ x: event.clientX, y: event.clientY });
  };

  if (users.length === 0) {
    return (
      <section className="urlaubTimelineWrap">
        <p className="urlaubEmpty">Keine Mitarbeiter geladen.</p>
      </section>
    );
  }

  const activeHighlight = dragPreviewKeys.size > 0 ? dragPreviewKeys : selectedKeys;

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
          {editMode && sessionUsername ? (
            <span className="urlaubQuota" aria-live="polite">
              Urlaub {calendarYear}:{" "}
              <strong className={urlaubDaysUsed > ANNUAL_URLAUB_DAYS ? "urlaubQuota--over" : ""}>
                {urlaubDaysUsed}
              </strong>{" "}
              / {ANNUAL_URLAUB_DAYS}
            </span>
          ) : (
            <span className="urlaubQuotaPlaceholder" hidden>
              / {ANNUAL_URLAUB_DAYS}
            </span>
          )}
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
            {CONTEXT_MENU_VARIANTS.map((variant) => (
              <span key={variant} className="urlaubCalLegendItem">
                <span className={`urlaubCalLegendSwatch ${variant}`} />{" "}
                {ABSENCE_VARIANT_LABELS[variant]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {editMode && sessionUsername ? (
        <p className="urlaubEditHint">
          Ziehen oder Doppelklick für Auswahl · Rechtsklick für Typ · Entf zum Löschen · Einfachklick
          toggelt einen Urlaubstag
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
                    ref={isEditable ? editableRowRef : undefined}
                    className={[
                      "urlaubTimelineRow",
                      isEditable ? "urlaubTimelineRow--editable" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{ width: gridWidth }}
                  >
                    {days.map((day) => {
                      const variant = variantForDate(user.blocks, day.dateKey, days);
                      const marked = variant !== null;
                      const isSelected = isEditable && activeHighlight.has(day.dateKey);
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
                            marked && variant ? `urlaubDayColBody--${variant}` : "",
                            isSelected ? "urlaubDayColBody--selected" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={isEditable ? () => handleDayClick(day.dateKey) : undefined}
                          onDoubleClick={
                            isEditable ? () => handleDayDoubleClick(day.dateKey) : undefined
                          }
                          onPointerDown={
                            isEditable ? (event) => handlePointerDown(event, day.dateKey) : undefined
                          }
                          onContextMenu={
                            isEditable ? (event) => handleContextMenu(event, day.dateKey) : undefined
                          }
                        />
                      );
                    })}
                    {user.blocks.map((block) => {
                      const pos = blockStyle(block, days);
                      if (!pos) return null;
                      return (
                        <div
                          key={`${user.username}-${block.startKey}-${block.endKey}-${block.variant}`}
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

      {contextMenu && editMode ? (
        <div
          className="urlaubContextMenu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="urlaubContextMenuTitle">
            {selectedKeys.size} Tag{selectedKeys.size === 1 ? "" : "e"}
          </p>
          {CONTEXT_MENU_VARIANTS.map((variant) => (
            <button
              key={variant}
              type="button"
              className={`urlaubContextMenuItem urlaubContextMenuItem--${variant}`}
              role="menuitem"
              onClick={() => applyVariantToSelection(variant)}
            >
              {ABSENCE_VARIANT_LABELS[variant]}
            </button>
          ))}
          <hr className="urlaubContextMenuSep" />
          <button
            type="button"
            className="urlaubContextMenuItem urlaubContextMenuItem--danger"
            role="menuitem"
            onClick={deleteSelection}
          >
            Löschen
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function urlaubCalendarTodayKey() {
  return dateKeyFromDate(new Date());
}
