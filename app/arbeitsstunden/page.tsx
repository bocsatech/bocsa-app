"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildUserMatchKeys } from "../../lib/aufgaben-arbeitsstunden";
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

type TimelineBlock = {
  id: string;
  leftPercent: number;
  widthPercent: number;
  isPoint: boolean;
};

type ViewPeriod = "tag" | "woche" | "monat" | "intervall";

type LoadedTimelineData = {
  displayName: string;
  userKeys: string[];
  machines: Machine[];
  fahrzeuge: PkwFahrzeug[];
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

export default function ArbeitsstundenPage() {
  const [loaded, setLoaded] = useState<LoadedTimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<ViewPeriod>("tag");
  const [anchorDate, setAnchorDate] = useState(() => germanToday());
  const [intervalFrom, setIntervalFrom] = useState(() => germanToday());
  const [intervalTo, setIntervalTo] = useState(() => germanToday());
  const [intervalFromInput, setIntervalFromInput] = useState(() => germanToday());
  const [intervalToInput, setIntervalToInput] = useState(() => germanToday());

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const sessionResponse = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      });
      const sessionData = await sessionResponse.json();
      const fullName =
        typeof sessionData?.profile?.fullName === "string"
          ? sessionData.profile.fullName.trim()
          : "";
      const username =
        typeof sessionData?.username === "string" ? sessionData.username.trim() : "";

      if (!username) {
        setLoaded({
          displayName: fullName || "—",
          userKeys: [],
          machines: [],
          fahrzeuge: [],
        });
        return;
      }

      const userKeys = buildUserMatchKeys(username, fullName);
      const [machinesResponse, fahrzeugeResponse] = await Promise.all([
        fetch("/api/machines", { credentials: "include", cache: "no-store" }),
        fetch("/api/pkw/fahrzeuge", { credentials: "include", cache: "no-store" }),
      ]);

      const machines = machinesResponse.ok ? ((await machinesResponse.json()) as Machine[]) : [];
      const fahrzeuge = fahrzeugeResponse.ok ? ((await fahrzeugeResponse.json()) as PkwFahrzeug[]) : [];

      setLoaded({
        displayName: fullName || username || "—",
        userKeys,
        machines,
        fahrzeuge,
      });
    } catch {
      setLoaded({
        displayName: "—",
        userKeys: [],
        machines: [],
        fahrzeuge: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  useEffect(() => {
    const onFocus = () => {
      void loadTimeline();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadTimeline]);

  const visibleDates = useMemo(
    () => resolveVisibleDates(period, anchorDate, intervalFrom, intervalTo),
    [period, anchorDate, intervalFrom, intervalTo]
  );

  const dayRows = useMemo(() => {
    if (!loaded) return [];

    return visibleDates.map((date) => ({
      date,
      blocks: collectTimelineBlocksForDay(
        loaded.machines,
        loaded.fahrzeuge,
        loaded.userKeys,
        date
      ),
    }));
  }, [loaded, visibleDates]);

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

  const displayName = loaded?.displayName ?? "—";

  return (
    <AppPageShell
      activeHref="/arbeitsstunden"
      subtitle="Betrieb"
      top={
        <header className="pageHeader compactPageHeader">
          <div>
            <h1 style={{ margin: 0 }}>Arbeitsstunden</h1>
            <p className="subtitle" style={{ margin: "6px 0 0" }}>
              Zeitbalken 07:00–17:00 · aus Arbeitsaufträgen
            </p>
          </div>
        </header>
      }
    >
      <div className="asSidebarStundenStack">
        {loading ? (
          <p className="asSidebarStundenLoading">Laden…</p>
        ) : null}
        {dayRows.map((row, index) => (
          <div key={row.date} className="asSidebarStundenDay">
            <div className="asSidebarStundenHeader">
              <p className="asSidebarStundenName">{index === 0 ? displayName : ""}</p>
              <div className="asSidebarStundenTimeline">
                <div
                  className="asSidebarStundenTimelineLabels"
                  style={{ gridTemplateColumns: `repeat(${HOUR_MARKS.length}, minmax(0, 1fr))` }}
                >
                  {HOUR_MARKS.map((hour) => (
                    <span key={hour}>{hourLabel(hour)}</span>
                  ))}
                </div>
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
              <p className="asSidebarStundenDate">{row.date}</p>
            </div>
            {index === 0 ? (
              <div className="asSidebarStundenPeriodRow">
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
              </div>
            ) : null}
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
          max-width: 52rem;
          padding: 8px 4px;
        }

        .asSidebarStundenLoading {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
        }

        .asSidebarStundenDay {
          display: grid;
          gap: 8px;
        }

        .asSidebarStundenHeader {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .asSidebarStundenName {
          flex-shrink: 0;
          min-width: 8rem;
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: #111827;
        }

        .asSidebarStundenTimeline {
          flex: 1 1 320px;
          min-width: 280px;
        }

        .asSidebarStundenDate {
          flex-shrink: 0;
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: #111827;
          white-space: nowrap;
        }

        .asSidebarStundenPeriodRow {
          display: flex;
          justify-content: flex-end;
        }

        .asSidebarStundenPeriodBtns {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 6px;
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
