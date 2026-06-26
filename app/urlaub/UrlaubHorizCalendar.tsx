"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addMonthOffset,
  austrianMonthLabel,
  buildMonthSegments,
  buildTimelineDays,
  dateKeyFromDate,
  firstDayIndexOfMonth,
  leftVisibleDayIndexAtScroll,
  monthLabelAtScroll,
  scrollIndexForWeekOffset,
  visibleMonthKeyAtScroll,
} from "../../lib/austria-holidays";
import {
  applyVariantToDateKeys,
  blockLayoutStyle,
  dateKeysForBlock,
  removeDateKeysFromBlocks,
  summarizeUrlaubQuotaInYear,
  variantForDate,
  wouldExceedUrlaubQuotaAfterApply,
} from "../../lib/urlaub-blocks";
import {
  ANNUAL_URLAUB_DAYS,
  ABSENCE_VARIANT_LABELS,
  APPLY_VARIANTS,
  formatUrlaubQuotaValue,
  type UrlaubBlock,
  type UrlaubBlockVariant,
  type UrlaubPortion,
  type UrlaubTimelineUser,
} from "../../lib/urlaub-timeline-users";

export const DAY_COLUMN_WIDTH = 40;

const TIMELINE_DAYS = 730;
const DAYS_BEFORE_TODAY = 180;

type Props = {
  initialUsers?: UrlaubTimelineUser[];
  anchorDate?: Date;
};

type VisibleMonthKey = {
  year: number;
  monthIndex: number;
};

export default function UrlaubHorizCalendar({ initialUsers = [], anchorDate }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const usersColRef = useRef<HTMLDivElement>(null);
  const syncingScrollRef = useRef(false);
  const initialScrollDoneRef = useRef(false);
  const visibleMonthKeyRef = useRef<VisibleMonthKey | null>(null);
  const persistTimerRef = useRef<number | null>(null);

  const [users, setUsers] = useState<UrlaubTimelineUser[]>(initialUsers);
  const [visibleMonth, setVisibleMonth] = useState("");
  const [sessionUsername, setSessionUsername] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
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
            annualDays: user.annualDays,
          }))
        );
      })
      .catch(() => undefined);
  }, []);

  const persistUserBlocks = useCallback(
    (blocks: UrlaubBlock[]) => {
      if (!sessionUsername) return;
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current);
      }
      setSaveState("saving");
      setSaveError("");
      persistTimerRef.current = window.setTimeout(() => {
        persistTimerRef.current = null;
        fetch("/api/urlaub", {
          method: "PUT",
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocks }),
        })
          .then(async (response) => {
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(
                typeof payload.error === "string" ? payload.error : "Speichern fehlgeschlagen"
              );
            }
            setSaveState("saved");
            setSaveError("");
          })
          .catch((error: unknown) => {
            setSaveState("error");
            setSaveError(error instanceof Error ? error.message : "Speichern fehlgeschlagen");
          });
      }, 450);
    },
    [sessionUsername]
  );

  useEffect(
    () => () => {
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current);
      }
    },
    []
  );

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
    () =>
      users.find(
        (user) => user.username.trim().toLowerCase() === sessionUsername.trim().toLowerCase()
      ) ?? null,
    [sessionUsername, users]
  );

  const currentUserAnnualDays = useMemo(() => {
    if (!currentUser) return ANNUAL_URLAUB_DAYS;
    if (typeof currentUser.annualDays === "number") {
      return currentUser.annualDays;
    }
    return ANNUAL_URLAUB_DAYS;
  }, [currentUser]);

  const todayKey = useMemo(() => dateKeyFromDate(anchor), [anchor]);

  const urlaubQuota = useMemo(
    () =>
      currentUser
        ? summarizeUrlaubQuotaInYear(
            currentUser.blocks,
            days,
            calendarYear,
            todayKey,
            currentUserAnnualDays
          )
        : null,
    [calendarYear, currentUser, currentUserAnnualDays, days, todayKey]
  );

  const todayIndex = days.findIndex((day) => day.isToday);
  const gridWidth = days.length * DAY_COLUMN_WIDTH;
  const monthSegments = useMemo(
    () => buildMonthSegments(days, DAY_COLUMN_WIDTH),
    [days]
  );

  const readVisibleMonthKey = useCallback((): VisibleMonthKey | null => {
    const viewport = scrollRef.current;
    if (!viewport || days.length === 0) return visibleMonthKeyRef.current;
    return visibleMonthKeyAtScroll(
      days,
      viewport.scrollLeft,
      DAY_COLUMN_WIDTH,
      viewport.clientWidth
    );
  }, [days]);

  const syncVisibleMonth = useCallback(() => {
    const key = readVisibleMonthKey();
    if (!key) return;
    visibleMonthKeyRef.current = key;
    setVisibleMonth(austrianMonthLabel(key.year, key.monthIndex));
  }, [readVisibleMonthKey]);

  const scrollToDayIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth", align: "start" | "view" = "view") => {
      const viewport = scrollRef.current;
      if (!viewport || index < 0) return;
      const left =
        align === "start"
          ? Math.max(0, index * DAY_COLUMN_WIDTH)
          : Math.max(0, index * DAY_COLUMN_WIDTH - viewport.clientWidth * 0.08);
      viewport.scrollTo({ left, behavior });
    },
    []
  );

  const scrollByMonth = useCallback(
    (direction: -1 | 1) => {
      const viewport = scrollRef.current;
      if (!viewport) return;

      const baseKey = visibleMonthKeyRef.current ?? readVisibleMonthKey();
      if (!baseKey) return;

      const target = addMonthOffset(baseKey.year, baseKey.monthIndex, direction);
      const index = firstDayIndexOfMonth(days, target.year, target.monthIndex);
      if (index < 0) return;

      visibleMonthKeyRef.current = target;
      setVisibleMonth(austrianMonthLabel(target.year, target.monthIndex));
      scrollToDayIndex(index, "smooth", "start");
    },
    [days, readVisibleMonthKey, scrollToDayIndex]
  );

  const scrollByWeek = useCallback(
    (direction: -1 | 1) => {
      const viewport = scrollRef.current;
      if (!viewport) return;

      const fromIndex = leftVisibleDayIndexAtScroll(viewport.scrollLeft, DAY_COLUMN_WIDTH);
      const targetIndex = scrollIndexForWeekOffset(fromIndex, direction, days.length);
      const day = days[targetIndex];
      if (day) {
        visibleMonthKeyRef.current = {
          year: day.date.getFullYear(),
          monthIndex: day.monthIndex,
        };
        setVisibleMonth(austrianMonthLabel(day.date.getFullYear(), day.monthIndex));
      }
      scrollToDayIndex(targetIndex, "smooth", "start");
    },
    [days, scrollToDayIndex]
  );

  const updateCurrentUserBlocks = useCallback(
    (updater: (blocks: UrlaubBlock[]) => UrlaubBlock[]) => {
      if (!sessionUsername) return;
      let nextBlocks: UrlaubBlock[] | null = null;
      setUsers((current) =>
        current.map((user) => {
          if (user.username.trim().toLowerCase() !== sessionUsername.trim().toLowerCase()) {
            return user;
          }
          nextBlocks = updater(user.blocks);
          return { ...user, blocks: nextBlocks };
        })
      );
      if (nextBlocks) persistUserBlocks(nextBlocks);
    },
    [persistUserBlocks, sessionUsername]
  );

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  const applyVariantToSelection = useCallback(
    (variant: UrlaubBlockVariant, portion: UrlaubPortion = 1) => {
      if (selectedKeys.size === 0) return;
      if (
        wouldExceedUrlaubQuotaAfterApply(
          currentUser?.blocks ?? [],
          [...selectedKeys],
          variant,
          days,
          calendarYear,
          todayKey,
          currentUserAnnualDays,
          portion
        )
      ) {
        setSaveState("error");
        setSaveError(
          `Maximal ${formatUrlaubQuotaValue(currentUserAnnualDays)} Urlaubstage pro Jahr — Kontingent überschritten.`
        );
        return;
      }
      updateCurrentUserBlocks((blocks) =>
        applyVariantToDateKeys(blocks, [...selectedKeys], variant, days, portion)
      );
      clearSelection();
      setSaveError("");
      setSaveState("idle");
    },
    [calendarYear, clearSelection, currentUser?.blocks, currentUserAnnualDays, days, selectedKeys, todayKey, updateCurrentUserBlocks]
  );

  const deleteSelection = useCallback(() => {
    if (selectedKeys.size === 0) return;
    updateCurrentUserBlocks((blocks) => removeDateKeysFromBlocks(blocks, selectedKeys, days));
    clearSelection();
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
    setVisibleMonth(
      monthLabelAtScroll(days, viewport.scrollLeft, DAY_COLUMN_WIDTH, viewport.clientWidth)
    );
    const day = days[todayIndex];
    if (day) {
      visibleMonthKeyRef.current = {
        year: day.date.getFullYear(),
        monthIndex: day.monthIndex,
      };
    }
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
      if (event.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearSelection, deleteSelection, editMode, selectedKeys.size]);

  const handleToggleEdit = () => {
    setEditMode((current) => !current);
  };

  const toggleDaySelection = (dateKey: string) => {
    if (!editMode || !sessionUsername) return;
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  if (users.length === 0) {
    return (
      <section className="urlaubTimelineWrap">
        <p className="urlaubEmpty">Keine Mitarbeiter geladen.</p>
      </section>
    );
  }

  const hasSelection = selectedKeys.size > 0;

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
          {sessionUsername && urlaubQuota ? (
            <span className="urlaubQuota" aria-live="polite">
              Urlaub {urlaubQuota.year}:{" "}
              <strong>{formatUrlaubQuotaValue(urlaubQuota.taken)}</strong> genommen ·{" "}
              <strong className="urlaubQuotaPlanned">
                {formatUrlaubQuotaValue(urlaubQuota.planned)}
              </strong>{" "}
              geplant ·{" "}
              <strong
                className={
                  urlaubQuota.remaining <= 0 && urlaubQuota.total >= currentUserAnnualDays
                    ? "urlaubQuota--over"
                    : ""
                }
              >
                {formatUrlaubQuotaValue(urlaubQuota.remaining)}
              </strong>{" "}
              übrig / {formatUrlaubQuotaValue(currentUserAnnualDays)}
            </span>
          ) : null}
          {saveState === "saving" ? (
            <span className="urlaubSaveState">Speichern…</span>
          ) : null}
          {saveState === "saved" ? (
            <span className="urlaubSaveState urlaubSaveState--ok">Gespeichert</span>
          ) : null}
          {saveState === "error" ? (
            <span className="urlaubSaveState urlaubSaveState--err" title={saveError}>
              {saveError || "Speichern fehlgeschlagen"}
            </span>
          ) : null}
          <button
            type="button"
            className={`urlaubEditBtn${editMode ? " urlaubEditBtn--active" : ""}`}
            onClick={handleToggleEdit}
            disabled={!sessionUsername}
          >
            {editMode ? "Fertig" : "Bearbeitung"}
          </button>
          {editMode && hasSelection ? (
            <button type="button" className="urlaubDeleteBtn" onClick={deleteSelection}>
              Löschen
            </button>
          ) : null}
        </div>
      </div>

      {editMode && sessionUsername ? (
        <div className="urlaubEditBar">
          <span className="urlaubEditBarLabel">
            {hasSelection
              ? `${selectedKeys.size} Tag${selectedKeys.size === 1 ? "" : "e"} ausgewählt — Löschen entfernt auch bestehende Einträge`
              : "Tage anklicken (auch bereits belegte) — dann Typ wählen oder Löschen"}
          </span>
          <div className="urlaubTypeBtns">
            {APPLY_VARIANTS.map((variant) => (
              <button
                key={variant}
                type="button"
                className={`urlaubTypeBtn urlaubTypeBtn--${variant}`}
                disabled={!hasSelection}
                onClick={() => applyVariantToSelection(variant, 1)}
              >
                {ABSENCE_VARIANT_LABELS[variant]}
              </button>
            ))}
            <button
              type="button"
              className="urlaubTypeBtn urlaubTypeBtn--urlaub urlaubTypeBtn--half"
              disabled={!hasSelection}
              onClick={() => applyVariantToSelection("urlaub", 0.5)}
            >
              Urlaub ½
            </button>
          </div>
        </div>
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
                editMode &&
                user.username.trim().toLowerCase() === sessionUsername.trim().toLowerCase()
                  ? "urlaubUserCell--editable"
                  : "",
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
                const isEditable =
                  editMode &&
                  user.username.trim().toLowerCase() === sessionUsername.trim().toLowerCase();
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
                      const isSelected = isEditable && selectedKeys.has(day.dateKey);
                      const hasBlock = variantForDate(user.blocks, day.dateKey, days) !== null;
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
                            isSelected ? "urlaubDayColBody--selected" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={isEditable ? () => toggleDaySelection(day.dateKey) : undefined}
                          aria-pressed={isEditable ? isSelected : undefined}
                          title={
                            isEditable
                              ? isSelected
                                ? `${day.dateKey} — ausgewählt`
                                : hasBlock
                                  ? `${day.dateKey} — belegt`
                                  : day.dateKey
                              : undefined
                          }
                        />
                      );
                    })}
                    {user.blocks.map((block) => {
                      const pos = blockLayoutStyle(block, days, DAY_COLUMN_WIDTH);
                      if (!pos) return null;
                      const blockDayKeys = isEditable ? dateKeysForBlock(block, days) : [];
                      const blockSelected =
                        isEditable && blockDayKeys.some((key) => selectedKeys.has(key));
                      const isHalf = block.portion === 0.5;
                      return (
                        <div
                          key={`${user.username}-${block.startKey}-${block.endKey}-${block.variant}-${block.portion ?? 1}`}
                          className={[
                            `urlaubBlock urlaubBlock--${block.variant}`,
                            isHalf ? "urlaubBlock--half" : "",
                            isEditable ? "urlaubBlock--editMode" : "",
                            blockSelected ? "urlaubBlock--selected" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={{ left: pos.left, width: pos.width }}
                          title={block.label}
                          aria-hidden={isEditable ? true : undefined}
                        >
                          {!isEditable ? block.label : null}
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
