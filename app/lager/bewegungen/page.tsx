"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppPageShell from "../../components/AppPageShell";
import GermanDateField from "../../components/GermanDateField";
import LagerBewegungFahrzeugLink from "../../components/LagerBewegungFahrzeugLink";
import LagerBewegungReferenzLink from "../../components/LagerBewegungReferenzLink";
import LagerBewegungRowCard from "../../components/LagerBewegungRowCard";
import {
  bewegungTypLabel,
  fetchLagerBewegungen,
  formatBewegungDatum,
  lagerBewegungZeitraumRange,
  type LagerBewegung,
  type LagerBewegungZeitraum,
} from "../../../lib/lager";
import { formatLagerNumber, formatLagerValue } from "../../../lib/lager";

export default function LagerBewegungenPage() {
  const [preset, setPreset] = useState<LagerBewegungZeitraum>("tag");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [rows, setRows] = useState<LagerBewegung[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canRead, setCanRead] = useState(false);

  const range = useMemo(
    () => lagerBewegungZeitraumRange(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await fetchLagerBewegungen({
      from: range.from,
      to: range.to,
    });
    if (error) {
      setLoadError(error.message);
      setRows([]);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  }, [range.from, range.to]);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((result) => {
        setCanRead((result.permissions ?? []).includes("warehouse.read"));
      });
  }, []);

  useEffect(() => {
    if (canRead) void load();
    else setLoading(false);
  }, [canRead, load]);

  const summary = useMemo(() => {
    let aus = 0;
    let ein = 0;
    for (const row of rows) {
      if (row.richtung === "ein") ein += row.menge;
      else aus += row.menge;
    }
    return { aus, ein, count: rows.length };
  }, [rows]);

  return (
    <AppPageShell
      activeHref="/lager/bewegungen"
      contentClassName="lagerBewegungenPage"
      top={
        <header className="pageHeader compactPageHeader">
          <div>
            <h1 style={{ margin: 0 }}>Lagerbewegungen</h1>
            <p className="subtitle" style={{ margin: "6px 0 0" }}>
              Entnahmen, Zugänge und Inventur — {range.label}
            </p>
          </div>
          <div className="detailTopActions">
            <Link href="/lager" className="pillButton outline">
              Ersatzteile
            </Link>
            <Link href="/lager/meldungen" className="pillButton outline">
              Meldungen
            </Link>
          </div>
        </header>
      }
    >
      <div className="lagerBewegungenFilter card">
        <div className="lagerZeitraumTabs">
          {(
            [
              ["tag", "Heute"],
              ["woche", "7 Tage"],
              ["monat", "30 Tage"],
              ["frei", "Zeitraum"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`pillButton outline${preset === key ? " active" : ""}`}
              onClick={() => setPreset(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {preset === "frei" ? (
          <div className="lagerZeitraumFrei">
            <label className="arbeitsauftragFilterField">
              <span>Von</span>
              <GermanDateField
                value={customFrom}
                onChange={setCustomFrom}
                valueFormat="iso"
              />
            </label>
            <label className="arbeitsauftragFilterField">
              <span>Bis</span>
              <GermanDateField value={customTo} onChange={setCustomTo} valueFormat="iso" />
            </label>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="welcomeCard">
          <h2>Laden…</h2>
        </div>
      ) : !canRead ? (
        <div className="welcomeCard">
          <h2>Kein Zugriff</h2>
        </div>
      ) : loadError ? (
        <div className="welcomeCard">
          <h2>Fehler</h2>
          <p>{loadError}</p>
        </div>
      ) : (
        <>
          <div className="lagerMeldungenSummary">
            <span className="lagerMeldungenStat">
              <strong>{summary.count}</strong> Buchungen
            </span>
            <span className="lagerMeldungenStat belowMin">
              <strong>{formatLagerNumber(summary.aus)}</strong> Ausgang
            </span>
            <span className="lagerMeldungenStat aboveMax">
              <strong>{formatLagerNumber(summary.ein)}</strong> Eingang
            </span>
          </div>

          <div className="lagerBewegungenMobileList" aria-label="Lagerbewegungen">
            {rows.length === 0 ? (
              <p className="lagerBewegungenMobileEmpty">Keine Bewegungen im gewählten Zeitraum.</p>
            ) : (
              rows.map((row) => <LagerBewegungRowCard key={row.id} row={row} />)
            )}
          </div>

          <article className="card machineTableWrap lagerBewegungenDesktopTable">
            <div className="machineTableScroll">
              <table className="machineTable lagerTable">
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Typ</th>
                    <th>Herstellernummer</th>
                    <th>Ersatzteil</th>
                    <th>Menge</th>
                    <th>Referenz</th>
                    <th>Fahrzeug / Maschine</th>
                    <th>Bemerkung</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8}>Keine Bewegungen im gewählten Zeitraum.</td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr
                        key={row.id}
                        className={row.richtung === "ein" ? "lagerBewegungEin" : "lagerBewegungAus"}
                      >
                        <td>{formatBewegungDatum(row.created_at)}</td>
                        <td>{bewegungTypLabel(row.typ, row.richtung)}</td>
                        <td>
                          <strong>{formatLagerValue(row.teil?.herstellernummer)}</strong>
                        </td>
                        <td className="lagerBezeichnungCell">
                          {row.teil?.bezeichnung?.trim() ?? ""}
                        </td>
                        <td>{formatLagerNumber(row.menge)}</td>
                        <td>
                          <LagerBewegungReferenzLink row={row} />
                        </td>
                        <td>
                          <LagerBewegungFahrzeugLink row={row} />
                        </td>
                        <td>{formatLagerValue(row.bemerkung)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}
    </AppPageShell>
  );
}
