"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TimelineUser } from "../../lib/arbeitsstunden-timeline-users";
import { buildUserMatchKeys } from "../../lib/arbeitsstunden-timeline-users";
import { periodRange } from "../../lib/arbeitsstunden";
import {
  formatGermanDate,
  germanToday,
  listGermanDatesInRange,
  normalizeGermanDate,
} from "../../lib/dates";
import { collectAllPkwWorkOrders } from "../../lib/pkw-work-orders";
import type { PkwFahrzeug } from "../../lib/types/pkw";
import type { Machine } from "../../lib/types/machine";
import {
  collectAllWorkOrders,
  parseWorkHours,
  workOrderUserLabel,
  type WorkOrder,
} from "../../lib/work-orders";
import AppPageShell from "../components/AppPageShell";

const WORK_START = 7;
const WORK_END = 17;
const WORK_START_MIN = WORK_START * 60;
const WORK_END_MIN = WORK_END * 60;
const WORK_SPAN_MIN = WORK_END_MIN - WORK_START_MIN;
const HOUR_MARKS = Array.from(
  { length: WORK_END - WORK_START + 1 },
  (_, index) => WORK_START + index
);

type LoadedMachinesData = {
  machines: Machine[];
  fahrzeuge: PkwFahrzeug[];
};

type TimelineBlock = {
  id: string;
  leftPercent: number;
  widthPercent: number;
  isPoint: boolean;
};

type ViewPeriod = "tag" | "woche" | "monat" | "intervall";

export type { TimelineUser } from "../../lib/arbeitsstunden-timeline-users";

type Props = {
  initialUsers: TimelineUser[];
};

function hourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function normalizeUserKey(value: string) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function orderMatchesUser(
  order: Pick<WorkOrder, "updatedBy" | "createdBy">,
  userKeys: string[]
) {
  const label = normalizeUserKey(workOrderUserLabel(order));
  if (!label || userKeys.length === 0) return false;

  return userKeys.some((key) => {
    if (!key) return false;
    return label === key || label.includes(key) || key.includes(label);
  });
}

function orderStartDate(order: WorkOrder) {
  if (order.createdAt) {
    const created = new Date(order.createdAt);
    if (!Number.isNaN(created.getTime())) return created;
  }

  const time = String(order.time ?? "").trim();
  if (!/^\d{2}:\d{2}$/.test(time)) return null;

  const [hours, minutes] = time.split(":").map(Number);
  const dateLabel = formatGermanDate(order.date);
  if (!dateLabel) return null;

  const [day, month, year] = dateLabel.split(".").map(Number);
  if (!day || !month || !year) return null;

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function minutesToPercent(minutes: number) {
  const clamped = Math.max(WORK_START_MIN, Math.min(WORK_END_MIN, minutes));
  return ((clamped - WORK_START_MIN) / WORK_SPAN_MIN) * 100;
}

function buildTimelineBlock(order: WorkOrder, dayLabel: string): TimelineBlock | null {
  const start = orderStartDate(order);
  if (!start) return null;
  if (formatGermanDate(start) !== dayLabel) return null;

  const startMinutes = start.getHours() * 60 + start.getMinutes();
  if (startMinutes >= WORK_END_MIN) return null;

  const hours = parseWorkHours(order.workHours);
  const hasHours = hours > 0;
  const leftPercent = minutesToPercent(startMinutes);

  if (!hasHours) {
    if (startMinutes < WORK_START_MIN) {
      return {
        id: order.id,
        leftPercent: 0,
        widthPercent: 0,
        isPoint: true,
      };
    }

    return {
      id: order.id,
      leftPercent,
      widthPercent: 0,
      isPoint: true,
    };
  }

  const endMinutes = Math.min(startMinutes + hours * 60, WORK_END_MIN);
  const visibleStart = Math.max(startMinutes, WORK_START_MIN);
  if (endMinutes <= visibleStart) return null;

  const widthPercent = Math.max(minutesToPercent(endMinutes) - minutesToPercent(visibleStart), 0.8);

  return {
    id: order.id,
    leftPercent: minutesToPercent(visibleStart),
    widthPercent,
    isPoint: false,
  };
}

function collectTimelineBlocksForDay(
  machines: Machine[],
  fahrzeuge: PkwFahrzeug[],
  userKeys: string[],
  dayLabel: string
) {
  const blocks: TimelineBlock[] = [];
  const seen = new Set<string>();

  for (const order of [...collectAllWorkOrders(machines), ...collectAllPkwWorkOrders(fahrzeuge)]) {
    if (!orderMatchesUser(order, userKeys)) continue;
    if (seen.has(order.id)) continue;

    const block = buildTimelineBlock(order, dayLabel);
    if (!block) continue;

    seen.add(order.id);
    blocks.push(block);
  }

  return blocks.sort((a, b) => a.leftPercent - b.leftPercent);
}

function resolveVisibleDates(
  period: ViewPeriod,
  anchorDate: string,
  intervalFrom: string,
  intervalTo: string
) {
  const anchor = normalizeGermanDate(anchorDate) || germanToday();

  if (period === "tag") {
    return [anchor];
  }

  if (period === "woche") {
    const range = periodRange("woche", anchor);
    return listGermanDatesInRange(range.from, range.to);
  }

  if (period === "monat") {
    const range = periodRange("monat", anchor);
    return listGermanDatesInRange(range.from, range.to);
  }

  const from = normalizeGermanDate(intervalFrom) || anchor;
  const to = normalizeGermanDate(intervalTo) || from;
  if (from.localeCompare(to) > 0) {
    return listGermanDatesInRange(to, from);
  }
  return listGermanDatesInRange(from, to);
}

export default function ArbeitsstundenTimeline({ initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(
    () => new Set(initialUsers.map((user) => user.username))
  );
  const [loaded, setLoaded] = useState<LoadedMachinesData | null>(null);
  const [period, setPeriod] = useState<ViewPeriod>("tag");
  const [anchorDate, setAnchorDate] = useState(() => germanToday());
  const [intervalFrom, setIntervalFrom] = useState(() => germanToday());
  const [intervalTo, setIntervalTo] = useState(() => germanToday());
  const [intervalFromInput, setIntervalFromInput] = useState(() => germanToday());
  const [intervalToInput, setIntervalToInput] = useState(() => germanToday());

  useEffect(() => {
    setUsers(initialUsers);
    setSelectedUsernames((prev) => {
      const next = new Set<string>();
      for (const user of initialUsers) {
        if (prev.size === 0 || prev.has(user.username)) {
          next.add(user.username);
        }
      }
      if (next.size === 0 && initialUsers.length > 0) {
        return new Set(initialUsers.map((user) => user.username));
      }
      for (const user of initialUsers) {
        if (!prev.has(user.username)) {
          next.add(user.username);
        }
      }
      return next;
    });
  }, [initialUsers]);

  useEffect(() => {
    if (initialUsers.length > 0) return;

    fetch("/api/arbeitsstunden/benutzer", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const rows = Array.isArray(payload?.users) ? payload.users : [];
        if (rows.length === 0) return;

        const mapped = rows
          .map((user: { username?: string; fullName?: string; displayName?: string }) => {
            const username = String(user.username ?? "").trim();
            if (!username) return null;
            const fullName = String(user.fullName ?? "").trim();
            const displayName = String(user.displayName ?? "").trim() || fullName || username;
            return {
              username,
              displayName,
              userKeys: buildUserMatchKeys(username, fullName),
            } satisfies TimelineUser;
          })
          .filter(Boolean) as TimelineUser[];

        setUsers(mapped);
        setSelectedUsernames(new Set(mapped.map((user) => user.username)));
      })
      .catch(() => undefined);
  }, [initialUsers.length]);

  const loadMachines = useCallback(async () => {
    try {
      const [machinesResponse, fahrzeugeResponse] = await Promise.all([
        fetch("/api/machines", { credentials: "include", cache: "no-store" }),
        fetch("/api/pkw/fahrzeuge", { credentials: "include", cache: "no-store" }),
      ]);

      const machines = machinesResponse.ok ? ((await machinesResponse.json()) as Machine[]) : [];
      const fahrzeuge = fahrzeugeResponse.ok ? ((await fahrzeugeResponse.json()) as PkwFahrzeug[]) : [];

      setLoaded({ machines, fahrzeuge });
    } catch {
      setLoaded({ machines: [], fahrzeuge: [] });
    }
  }, []);

  useEffect(() => {
    void loadMachines();
  }, [loadMachines]);

  useEffect(() => {
    const onFocus = () => {
      void loadMachines();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadMachines]);

  const visibleDates = useMemo(
    () => resolveVisibleDates(period, anchorDate, intervalFrom, intervalTo),
    [period, anchorDate, intervalFrom, intervalTo]
  );

  const machines = loaded?.machines ?? [];
  const fahrzeuge = loaded?.fahrzeuge ?? [];

  const visibleUsers = useMemo(
    () => users.filter((user) => selectedUsernames.has(user.username)),
    [users, selectedUsernames]
  );

  function toggleUserSelection(username: string, checked: boolean) {
    setSelectedUsernames((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(username);
      } else {
        next.delete(username);
      }
      return next;
    });
  }

  function selectAllUsers() {
    setSelectedUsernames(new Set(users.map((user) => user.username)));
  }

  const hiddenUsers = useMemo(
    () => users.filter((user) => !selectedUsernames.has(user.username)),
    [users, selectedUsernames]
  );

  const timelineRows = useMemo(
    () =>
      visibleDates.flatMap((date) =>
        visibleUsers.map((user) => ({
          key: `${date}::${user.username}`,
          username: user.username,
          date,
          displayName: user.displayName,
          blocks: collectTimelineBlocksForDay(machines, fahrzeuge, user.userKeys, date),
        }))
      ),
    [visibleUsers, visibleDates, machines, fahrzeuge]
  );

  const firstRowByUser = useMemo(() => {
    const seen = new Set<string>();
    const first = new Set<string>();
    for (const row of timelineRows) {
      if (!seen.has(row.username)) {
        seen.add(row.username);
        first.add(row.key);
      }
    }
    return first;
  }, [timelineRows]);

  function applyInterval() {
    const from = normalizeGermanDate(intervalFromInput) || germanToday();
    const to = normalizeGermanDate(intervalToInput) || from;
    setIntervalFrom(from);
    setIntervalTo(to);
    setIntervalFromInput(from);
    setIntervalToInput(to);
    setAnchorDate(from);
    setPeriod("intervall");
  }

  function selectTag() {
    const today = germanToday();
    setAnchorDate(today);
    setPeriod("tag");
    setIntervalFrom(today);
    setIntervalTo(today);
    setIntervalFromInput(today);
    setIntervalToInput(today);
  }

  function selectWoche() {
    setAnchorDate(visibleDates[0] ?? anchorDate);
    setPeriod("woche");
  }

  function selectMonat() {
    setAnchorDate(visibleDates[0] ?? anchorDate);
    setPeriod("monat");
  }

  function selectIntervall() {
    setPeriod("intervall");
  }

  const periodButtons = (
    <div className="asSidebarStundenPeriodBtns">
      <button
        type="button"
        className={`asSidebarStundenPeriodBtn${period === "tag" ? " active" : ""}`}
        onClick={selectTag}
      >
        Tag
      </button>
      <button
        type="button"
        className={`asSidebarStundenPeriodBtn${period === "woche" ? " active" : ""}`}
        onClick={selectWoche}
      >
        Woche
      </button>
      <button
        type="button"
        className={`asSidebarStundenPeriodBtn${period === "monat" ? " active" : ""}`}
        onClick={selectMonat}
      >
        Monat
      </button>
      <button
        type="button"
        className={`asSidebarStundenPeriodBtn${period === "intervall" ? " active" : ""}`}
        onClick={selectIntervall}
      >
        Intervall
      </button>
    </div>
  );

  return (
    <AppPageShell activeHref="/arbeitsstunden" subtitle="Betrieb">
      <div className="asSidebarStundenStack">
        {hiddenUsers.length > 0 ? (
          <div className="asSidebarStundenUserPick">
            <span className="asSidebarStundenUserPickLabel">Ausgeblendet</span>
            {hiddenUsers.map((user) => (
              <label key={user.username} className="asSidebarStundenUserPickItem">
                <input
                  type="checkbox"
                  className="asSidebarStundenCheck"
                  checked={false}
                  onChange={() => toggleUserSelection(user.username, true)}
                  aria-label={`${user.displayName} einblenden`}
                />
                <span>{user.displayName}</span>
              </label>
            ))}
          </div>
        ) : null}

        {visibleUsers.length === 0 ? (
          <div className="asSidebarStundenEmpty">
            <p>Kein Benutzer ausgewählt.</p>
            <button type="button" className="asSidebarStundenSelectAll" onClick={selectAllUsers}>
              Alle auswählen
            </button>
          </div>
        ) : null}

        {timelineRows.map((row, rowIndex) => (
          <div key={row.key} className="asSidebarStundenDay">
            <div className="asSidebarStundenHeader">
              <div className="asSidebarStundenName">
                {firstRowByUser.has(row.key) ? (
                  <label className="asSidebarStundenNameLabel">
                    <input
                      type="checkbox"
                      className="asSidebarStundenCheck"
                      checked={selectedUsernames.has(row.username)}
                      onChange={(event) => toggleUserSelection(row.username, event.target.checked)}
                      aria-label={`${row.displayName} vergleichen`}
                    />
                    <span>{row.displayName}</span>
                  </label>
                ) : (
                  <span className="asSidebarStundenNameRepeat">{row.displayName}</span>
                )}
              </div>
              <div className="asSidebarStundenTimeline">
                {rowIndex === 0 ? (
                  <div
                    className="asSidebarStundenTimelineLabels"
                    style={{ gridTemplateColumns: `repeat(${HOUR_MARKS.length}, minmax(0, 1fr))` }}
                  >
                    {HOUR_MARKS.map((hour) => (
                      <span key={hour}>{hourLabel(hour)}</span>
                    ))}
                  </div>
                ) : (
                  <div className="asSidebarStundenTimelineLabelsSpacer" aria-hidden="true" />
                )}
                <div className="asSidebarStundenTimelineTrack" aria-hidden="true">
                  {row.blocks.map((block) =>
                    block.isPoint ? (
                      <span
                        key={block.id}
                        className="asSidebarStundenBlockPoint"
                        style={{ left: `${block.leftPercent}%` }}
                      />
                    ) : (
                      <span
                        key={block.id}
                        className="asSidebarStundenBlock"
                        style={{
                          left: `${block.leftPercent}%`,
                          width: `${block.widthPercent}%`,
                        }}
                      />
                    )
                  )}
                  {HOUR_MARKS.map((hour, tickIndex) => (
                    <span
                      key={hour}
                      className="asSidebarStundenTimelineTick"
                      style={{ left: `${(tickIndex / (HOUR_MARKS.length - 1)) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="asSidebarStundenMeta">
                <p className="asSidebarStundenDate">{row.date}</p>
                {periodButtons}
              </div>
            </div>
          </div>
        ))}

        {period === "intervall" ? (
          <div className="asSidebarStundenInterval">
            <label className="asSidebarStundenIntervalField">
              <span>Von</span>
              <input
                type="text"
                value={intervalFromInput}
                placeholder="TT.MM.JJJJ"
                onChange={(event) => setIntervalFromInput(event.target.value)}
                onBlur={() => {
                  const normalized = normalizeGermanDate(intervalFromInput);
                  if (normalized) setIntervalFromInput(normalized);
                }}
              />
            </label>
            <label className="asSidebarStundenIntervalField">
              <span>Bis</span>
              <input
                type="text"
                value={intervalToInput}
                placeholder="TT.MM.JJJJ"
                onChange={(event) => setIntervalToInput(event.target.value)}
                onBlur={() => {
                  const normalized = normalizeGermanDate(intervalToInput);
                  if (normalized) setIntervalToInput(normalized);
                }}
              />
            </label>
            <button type="button" className="asSidebarStundenPeriodBtn" onClick={applyInterval}>
              Anwenden
            </button>
          </div>
        ) : null}
      </div>
      <style jsx>{`
        .asSidebarStundenStack {
          display: grid;
          gap: 14px;
          max-width: 64rem;
          padding: 8px 4px;
        }

        .asSidebarStundenDay {
          display: grid;
          gap: 8px;
        }

        .asSidebarStundenHeader {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .asSidebarStundenName {
          flex-shrink: 0;
          min-width: 7rem;
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: #111827;
        }

        .asSidebarStundenNameLabel {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
        }

        .asSidebarStundenNameLabel span,
        .asSidebarStundenNameRepeat {
          line-height: 1.2;
        }

        .asSidebarStundenNameRepeat {
          display: block;
          padding-left: 23px;
        }

        .asSidebarStundenCheck {
          width: 15px;
          height: 15px;
          margin: 0;
          flex-shrink: 0;
          accent-color: #111827;
          cursor: pointer;
        }

        .asSidebarStundenUserPick {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px 12px;
          padding: 8px 10px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #f9fafb;
        }

        .asSidebarStundenUserPickLabel {
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-right: 4px;
        }

        .asSidebarStundenUserPickItem {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #111827;
          cursor: pointer;
          user-select: none;
        }

        .asSidebarStundenEmpty {
          margin: 0;
          padding: 12px 10px;
          color: #6b7280;
          font-size: 0.95rem;
          text-align: center;
        }

        .asSidebarStundenEmpty p {
          margin: 0;
        }

        .asSidebarStundenSelectAll {
          margin-top: 10px;
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #111827;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .asSidebarStundenSelectAll:hover {
          background: #f9fafb;
        }

        .asSidebarStundenTimeline {
          flex: 1 1 240px;
          min-width: 200px;
        }

        .asSidebarStundenTimelineLabelsSpacer {
          height: 17px;
          margin-bottom: 6px;
        }

        .asSidebarStundenMeta {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          min-width: 11rem;
        }

        .asSidebarStundenDate {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: #111827;
          white-space: nowrap;
        }

        .asSidebarStundenPeriodBtns {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 4px;
        }

        .asSidebarStundenPeriodBtn {
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #111827;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .asSidebarStundenPeriodBtn.active {
          background: #111827;
          border-color: #111827;
          color: #ffffff;
        }

        .asSidebarStundenInterval {
          display: flex;
          flex-wrap: wrap;
          align-items: end;
          gap: 10px;
          padding-left: calc(8rem + 20px);
        }

        .asSidebarStundenIntervalField {
          display: grid;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
        }

        .asSidebarStundenIntervalField input {
          min-width: 7.5rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 6px 8px;
          font-size: 14px;
        }

        .asSidebarStundenTimelineLabels {
          display: grid;
          margin-bottom: 6px;
          font-size: 10px;
          font-weight: 600;
          color: #6b7280;
          letter-spacing: 0.02em;
        }

        .asSidebarStundenTimelineLabels span {
          text-align: center;
          white-space: nowrap;
        }

        .asSidebarStundenTimelineLabels span:first-child {
          text-align: left;
        }

        .asSidebarStundenTimelineLabels span:last-child {
          text-align: right;
        }

        .asSidebarStundenTimelineTrack {
          position: relative;
          height: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: linear-gradient(to right, #e5e7eb 0%, #d1d5db 100%);
        }

        .asSidebarStundenBlock {
          position: absolute;
          top: 1px;
          bottom: 1px;
          border-radius: 4px;
          background: #047857;
          z-index: 2;
        }

        .asSidebarStundenBlockPoint {
          position: absolute;
          top: 1px;
          bottom: 1px;
          width: 3px;
          margin-left: -1.5px;
          border-radius: 2px;
          background: #047857;
          z-index: 3;
        }

        .asSidebarStundenTimelineTick {
          position: absolute;
          top: 2px;
          bottom: 2px;
          width: 1px;
          margin-left: -0.5px;
          background: rgba(255, 255, 255, 0.7);
          z-index: 1;
        }
      `}</style>
    </AppPageShell>
  );
}
