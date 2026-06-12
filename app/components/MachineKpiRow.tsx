"use client";

import { useMemo } from "react";
import {
  getGeratstatusValue,
  getInternExpiryValue,
  getLastServiceDateValue,
  getServiceValidUntil,
  parseDateOnly,
  startOfDay,
  type MachineRecord,
} from "../../lib/machines";
import type { Machine } from "../../lib/types/machine";

type Props = {
  machines: Machine[];
};

type KpiItem = {
  key: string;
  title: string;
  accent?: string;
  value: number;
  subtitle: string;
  icon: "excavator" | "truck" | "wrench" | "gear" | "clipboard" | "warning";
};

function isDueWithinDays(value: unknown, today: Date, withinDays: number) {
  const date = parseDateOnly(value);
  if (!date) return false;

  const limit = new Date(today);
  limit.setDate(limit.getDate() + withinDays);
  const day = startOfDay(date).getTime();
  return day <= startOfDay(limit).getTime();
}

function computeStats(machines: Machine[]) {
  const total = machines.length;
  const today = startOfDay(new Date());

  let imEinsatz = 0;
  let werkstatt = 0;
  let serviceFaellig = 0;
  let pruefungenFaellig = 0;
  let schadensmeldungen = 0;

  const depots = new Set<string>();

  for (const machine of machines) {
    const record = machine as MachineRecord;
    const depot = String(machine.depot ?? "").trim();
    if (depot) depots.add(depot);

    const status = getGeratstatusValue(record).trim().toLowerCase();
    if (status.includes("reparatur") || status.includes("reperatur")) {
      werkstatt += 1;
    } else {
      imEinsatz += 1;
    }

    const serviceUntil = getServiceValidUntil(getLastServiceDateValue(record));
    if (serviceUntil && startOfDay(serviceUntil).getTime() <= startOfDay(today).getTime()) {
      serviceFaellig += 1;
    } else if (
      serviceUntil &&
      isDueWithinDays(serviceUntil, today, 30)
    ) {
      serviceFaellig += 1;
    }

    const pruefDates = [
      getInternExpiryValue(record),
      machine.prufung,
      machine.tpg_hebetechnik,
      machine.elektro_ove,
      machine.section_57a,
    ];
    if (pruefDates.some((value) => isDueWithinDays(value, today, 30))) {
      pruefungenFaellig += 1;
    }

    const meldung = String(machine.meldung_status ?? "").toLowerCase();
    if (meldung.includes("vorhanden")) {
      schadensmeldungen += 1;
    }
  }

  const pct = (count: number) =>
    total > 0 ? `${Math.round((count / total) * 100)} % der Gesamtmaschinen` : "0 % der Gesamtmaschinen";

  const items: KpiItem[] = [
    {
      key: "total",
      title: "Gesamtmaschinen",
      value: total,
      subtitle: depots.size > 0 ? `${depots.size} Standorte` : "Alle Standorte",
      icon: "excavator",
    },
    {
      key: "einsatz",
      title: "Im Einsatz",
      accent: "I",
      value: imEinsatz,
      subtitle: pct(imEinsatz),
      icon: "truck",
    },
    {
      key: "werkstatt",
      title: "Werkstatt",
      accent: "W",
      value: werkstatt,
      subtitle: pct(werkstatt),
      icon: "wrench",
    },
    {
      key: "service",
      title: "Service fällig",
      accent: "S",
      value: serviceFaellig,
      subtitle: "Nächste 30 Tage",
      icon: "gear",
    },
    {
      key: "pruefung",
      title: "Prüfungen fällig",
      accent: "P",
      value: pruefungenFaellig,
      subtitle: "Nächste 30 Tage",
      icon: "clipboard",
    },
    {
      key: "schaden",
      title: "Schadensmeldungen",
      accent: "S",
      value: schadensmeldungen,
      subtitle: "Offene Meldungen",
      icon: "warning",
    },
  ];

  return items;
}

function KpiIcon({ name }: { name: KpiItem["icon"] }) {
  switch (name) {
    case "excavator":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4 18h8M6 14l2-4h6l2 4M14 10l3-2 3 2v4h-6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="15" cy="18" r="2" />
        </svg>
      );
    case "truck":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M3 8h11v8H3zM14 10h3l3 3v3h-6z" strokeLinejoin="round" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="18" cy="17" r="2" />
        </svg>
      );
    case "wrench":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path
            d="M14 4a4 4 0 0 1 1.2 7.8L8 19l-3 1 1-3 7.2-7.2A4 4 0 0 1 14 4z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "gear":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path
            d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "clipboard":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="6" y="5" width="12" height="16" rx="2" />
          <path d="M9 5.5h6a1 1 0 0 0 0-2H9a1 1 0 0 0 0 2z" />
          <path d="M9 11h6M9 15h4" strokeLinecap="round" />
        </svg>
      );
    case "warning":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 4l9 16H3z" strokeLinejoin="round" />
          <path d="M12 10v4M12 17h.01" strokeLinecap="round" />
        </svg>
      );
  }
}

export default function MachineKpiRow({ machines }: Props) {
  const items = useMemo(() => computeStats(machines), [machines]);

  return (
    <div className="maschinenKpiRow" aria-label="Maschinen-Kennzahlen">
      {items.map((item) => (
        <article key={item.key} className="maschinenKpiCard">
          <div className="maschinenKpiCardHead">
            <h2 className="maschinenKpiCardTitle">
              {item.accent ? (
                <>
                  <span className="maschinenKpiAccent">{item.accent}</span>
                  {item.title.slice(item.accent.length)}
                </>
              ) : (
                item.title
              )}
            </h2>
            <span className="maschinenKpiCardIcon">
              <KpiIcon name={item.icon} />
            </span>
          </div>
          <p className="maschinenKpiCardValue">{item.value}</p>
          <p className="maschinenKpiCardSub">{item.subtitle}</p>
        </article>
      ))}
    </div>
  );
}
