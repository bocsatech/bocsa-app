"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatAufgabenStunden,
  type AufgabenStundenEintrag,
  type AufgabenStundenTag,
  type AuftragStundenPeriod,
} from "../../lib/aufgaben-arbeitsstunden";
import { buildArbeitsauftragDetailHref } from "../../lib/arbeitsauftrag-routes";
import { buildPkwArbeitsauftragDetailHref } from "../../lib/pkw-arbeitsauftrag-routes";
import { germanToday, normalizeGermanDate } from "../../lib/dates";
import { toAustriaDateString } from "../../lib/machines";
import "../arbeitsauftrag-form.css";
import "../arbeitsstunden/arbeitsstunden.css";

type StundenResponse = {
  username: string;
  gesamtStunden: number;
  tage: AufgabenStundenTag[];
  period?: AuftragStundenPeriod;
  range?: { from: string; to: string };
  error?: string;
};

function displayToGermanDate(value: string) {
  return normalizeGermanDate(value) ?? "";
}

const MEINE_STUNDEN_PATH = "/arbeitsstunden/aus-auftraegen";

function entryEditHref(entry: AufgabenStundenEintrag) {
  if (entry.quelle === "pkw") {
    return buildPkwArbeitsauftragDetailHref({
      fahrzeugId: entry.parentId,
      auftragId: entry.workOrderId,
      edit: true,
      from: MEINE_STUNDEN_PATH,
    });
  }

  return buildArbeitsauftragDetailHref({
    machineId: entry.parentId,
    auftragId: entry.workOrderId,
    edit: true,
    from: MEINE_STUNDEN_PATH,
  });
}

export default function ArbeitsstundenAuftragView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [gesamtStunden, setGesamtStunden] = useState(0);
  const [tage, setTage] = useState<AufgabenStundenTag[]>([]);
  const [period, setPeriod] = useState<AuftragStundenPeriod>("alle");
  const [anchorDisplay, setAnchorDisplay] = useState(
    toAustriaDateString(germanToday())
  );
  const [fromDisplay, setFromDisplay] = useState(
    toAustriaDateString(germanToday())
  );
  const [toDisplay, setToDisplay] = useState(toAustriaDateString(germanToday()));
  const [rangeLabel, setRangeLabel] = useState<{ from: string; to: string } | null>(
    null
  );

  const anchorDe = useMemo(
    () => displayToGermanDate(anchorDisplay) || germanToday(),
    [anchorDisplay]
  );
  const fromDe = useMemo(
    () => displayToGermanDate(fromDisplay) || germanToday(),
    [fromDisplay]
  );
  const toDe = useMemo(
    () => displayToGermanDate(toDisplay) || germanToday(),
    [toDisplay]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      period,
      anchor: anchorDe,
    });
    if (period === "intervall") {
      params.set("from", fromDe);
      params.set("to", toDe);
    }

    const response = await fetch(`/api/arbeitsstunden/aus-auftraegen?${params}`, {
      credentials: "include",
      cache: "no-store",
    });
    const result = (await response.json().catch(() => ({}))) as StundenResponse;

    if (!response.ok) {
      setError(result.error ?? "Arbeitsstunden konnten nicht geladen werden.");
      setTage([]);
      setLoading(false);
      return;
    }

    setUsername(result.username ?? "");
    setGesamtStunden(result.gesamtStunden ?? 0);
    setTage(result.tage ?? []);
    setRangeLabel(result.range ?? null);
    setLoading(false);
  }, [period, anchorDe, fromDe, toDe]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="asAuftragStundenPage">
      <div className="arbeitsauftragFilters asAuftragFilters">
        <label className="arbeitsauftragFilterField">
          <span>Zeitraum</span>
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as AuftragStundenPeriod)}
          >
            <option value="alle">Alle</option>
            <option value="tag">Tag</option>
            <option value="woche">Woche</option>
            <option value="monat">Monat</option>
            <option value="intervall">Intervall</option>
          </select>
        </label>

        {period === "intervall" ? (
          <>
            <label className="arbeitsauftragFilterField">
              <span>Von</span>
              <input
                type="text"
                value={fromDisplay}
                placeholder="TT.MM.JJJJ"
                onChange={(event) => setFromDisplay(event.target.value)}
                onBlur={() => {
                  const normalized = displayToGermanDate(fromDisplay);
                  if (normalized) setFromDisplay(toAustriaDateString(normalized));
                }}
              />
            </label>
            <label className="arbeitsauftragFilterField">
              <span>Bis</span>
              <input
                type="text"
                value={toDisplay}
                placeholder="TT.MM.JJJJ"
                onChange={(event) => setToDisplay(event.target.value)}
                onBlur={() => {
                  const normalized = displayToGermanDate(toDisplay);
                  if (normalized) setToDisplay(toAustriaDateString(normalized));
                }}
              />
            </label>
          </>
        ) : period === "alle" ? null : (
          <label className="arbeitsauftragFilterField">
            <span>{period === "tag" ? "Datum" : "Stichtag"}</span>
            <input
              type="text"
              value={anchorDisplay}
              placeholder="TT.MM.JJJJ"
              onChange={(event) => setAnchorDisplay(event.target.value)}
              onBlur={() => {
                const normalized = displayToGermanDate(anchorDisplay);
                if (normalized) setAnchorDisplay(toAustriaDateString(normalized));
              }}
            />
          </label>
        )}

        <button type="button" className="pillButton outline" onClick={() => void loadData()}>
          Anwenden
        </button>
      </div>

      {period === "alle" ? (
        <p className="asAuftragRangeHint">Zeitraum: Alle Arbeitsaufträge</p>
      ) : rangeLabel ? (
        <p className="asAuftragRangeHint">
          Zeitraum: {rangeLabel.from}
          {rangeLabel.to !== rangeLabel.from ? ` – ${rangeLabel.to}` : ""}
        </p>
      ) : null}

      {loading ? (
        <div className="welcomeCard">
          <h2>Laden…</h2>
        </div>
      ) : error ? (
        <div className="welcomeCard">
          <h2>Fehler</h2>
          <p>{error}</p>
        </div>
      ) : (
        <>
          <article className="card usersPanel asAuftragSummaryCard">
            <div className="asDayGrid">
              <div className="asStatCard">
                <strong>Benutzer</strong>
                <b>{username || "—"}</b>
              </div>
              <div className="asStatCard ok">
                <strong>Arbeitsstunden gesamt</strong>
                <b>{formatAufgabenStunden(gesamtStunden)} h</b>
              </div>
              <div className="asStatCard">
                <strong>Tage mit Einträgen</strong>
                <b>{tage.length}</b>
              </div>
            </div>
          </article>

          {tage.length === 0 ? (
            <div className="welcomeCard">
              <p>Keine Arbeitsstunden in Arbeitsaufträgen für diesen Zeitraum gefunden.</p>
            </div>
          ) : (
            tage.map((tag) => (
              <article key={tag.datum} className="card usersPanel asAuftragDayCard">
                <header className="asAuftragDayHead">
                  <div className="asAuftragDayTitleRow">
                    <h2>{tag.datum}</h2>
                    <Link
                      href={`/arbeitsauftrag?dateFrom=${encodeURIComponent(tag.datum)}&dateTo=${encodeURIComponent(tag.datum)}&from=${encodeURIComponent(MEINE_STUNDEN_PATH)}`}
                      className="pillButton outline asAuftragAddBtn"
                    >
                      + hinzufügen
                    </Link>
                  </div>
                  <span className="asAuftragDayTotal">
                    {formatAufgabenStunden(tag.gesamtStunden)} h
                  </span>
                </header>
                <div className="machineTableScroll">
                  <table className="asEntriesTable">
                    <thead>
                      <tr>
                        <th>Auftrag</th>
                        <th>Referenz</th>
                        <th>Bezeichnung</th>
                        <th>Stunden</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {tag.eintraege.map((entry) => (
                        <tr key={`${entry.workOrderId}-${entry.quelle}`}>
                          <td>{entry.auftragNr}</td>
                          <td>{entry.referenz}</td>
                          <td>{entry.bezeichnung}</td>
                          <td>{formatAufgabenStunden(entry.stunden)} h</td>
                          <td className="asAuftragRowAction">
                            <Link
                              href={entryEditHref(entry)}
                              className="pillButton outline asAuftragEditBtn"
                            >
                              Bearbeiten
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))
          )}
        </>
      )}
    </div>
  );
}
