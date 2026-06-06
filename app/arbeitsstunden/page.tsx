"use client";

import { useCallback, useEffect, useState } from "react";
import { buildUserMatchKeys } from "../../lib/aufgaben-arbeitsstunden";
import { formatGermanDate, germanToday } from "../../lib/dates";
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

type TimelineBlock = {
  id: string;
  leftPercent: number;
  widthPercent: number;
  isPoint: boolean;
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

function buildTimelineBlock(order: WorkOrder, today: string): TimelineBlock | null {
  const start = orderStartDate(order);
  if (!start) return null;
  if (formatGermanDate(start) !== today) return null;

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

function collectTodayTimelineBlocks(
  machines: Machine[],
  fahrzeuge: PkwFahrzeug[],
  userKeys: string[],
  today: string
) {
  const blocks: TimelineBlock[] = [];
  const seen = new Set<string>();

  for (const order of [...collectAllWorkOrders(machines), ...collectAllPkwWorkOrders(fahrzeuge)]) {
    if (!orderMatchesUser(order, userKeys)) continue;
    if (seen.has(order.id)) continue;

    const block = buildTimelineBlock(order, today);
    if (!block) continue;

    seen.add(order.id);
    blocks.push(block);
  }

  return blocks.sort((a, b) => a.leftPercent - b.leftPercent);
}

export default function ArbeitsstundenPage() {
  const [displayName, setDisplayName] = useState("—");
  const [timelineBlocks, setTimelineBlocks] = useState<TimelineBlock[]>([]);

  const loadTimeline = useCallback(async () => {
    const today = germanToday();

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

      setDisplayName(fullName || username || "—");

      if (!username) {
        setTimelineBlocks([]);
        return;
      }

      const userKeys = buildUserMatchKeys(username, fullName);
      const [machinesResponse, fahrzeugeResponse] = await Promise.all([
        fetch("/api/machines", { credentials: "include", cache: "no-store" }),
        fetch("/api/pkw/fahrzeuge", { credentials: "include", cache: "no-store" }),
      ]);

      const machines = machinesResponse.ok ? ((await machinesResponse.json()) as Machine[]) : [];
      const fahrzeuge = fahrzeugeResponse.ok ? ((await fahrzeugeResponse.json()) as PkwFahrzeug[]) : [];

      setTimelineBlocks(collectTodayTimelineBlocks(machines, fahrzeuge, userKeys, today));
    } catch {
      setTimelineBlocks([]);
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

  const hourMarks = Array.from({ length: WORK_END - WORK_START + 1 }, (_, index) => WORK_START + index);
  const todayLabel = germanToday();

  return (
    <AppPageShell activeHref="/arbeitsstunden" subtitle="Betrieb">
      <div className="asSidebarStundenHeader">
        <p className="asSidebarStundenName">{displayName}</p>
        <div className="asSidebarStundenTimeline">
          <div
            className="asSidebarStundenTimelineLabels"
            style={{ gridTemplateColumns: `repeat(${hourMarks.length}, minmax(0, 1fr))` }}
          >
            {hourMarks.map((hour) => (
              <span key={hour}>{hourLabel(hour)}</span>
            ))}
          </div>
          <div className="asSidebarStundenTimelineTrack" aria-hidden="true">
            {timelineBlocks.map((block) =>
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
            {hourMarks.map((hour, index) => (
              <span
                key={hour}
                className="asSidebarStundenTimelineTick"
                style={{ left: `${(index / (hourMarks.length - 1)) * 100}%` }}
              />
            ))}
          </div>
        </div>
        <p className="asSidebarStundenDate">{todayLabel}</p>
      </div>
      <style jsx>{`
        .asSidebarStundenHeader {
          display: flex;
          align-items: center;
          gap: 20px;
          max-width: 52rem;
          padding: 8px 4px;
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
          flex: 1;
          min-width: 0;
        }

        .asSidebarStundenDate {
          flex-shrink: 0;
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: #111827;
          white-space: nowrap;
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
