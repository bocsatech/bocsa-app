"use client";

import { useEffect, useState } from "react";
import { germanToday } from "../../lib/dates";
import AppPageShell from "../components/AppPageShell";

const WORK_START = 7;
const WORK_END = 17;

function hourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

export default function ArbeitsstundenPage() {
  const [displayName, setDisplayName] = useState("—");

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        const fullName =
          typeof data?.profile?.fullName === "string" ? data.profile.fullName.trim() : "";
        const username = typeof data?.username === "string" ? data.username.trim() : "";
        setDisplayName(fullName || username || "—");
      })
      .catch(() => setDisplayName("—"));
  }, []);

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

        .asSidebarStundenTimelineTick {
          position: absolute;
          top: 2px;
          bottom: 2px;
          width: 1px;
          margin-left: -0.5px;
          background: rgba(255, 255, 255, 0.7);
        }
      `}</style>
    </AppPageShell>
  );
}
