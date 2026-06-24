"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatAufgabenStunden,
  type AufgabenStundenEintrag,
  type AufgabenStundenTag,
  type AuftragStundenPeriod,
} from "../../lib/aufgaben-arbeitsstunden";
import { parseStundenInput } from "../../lib/arbeitsstunden";
import { buildArbeitsauftragDetailHref } from "../../lib/arbeitsauftrag-routes";
import { buildPkwArbeitsauftragDetailHref } from "../../lib/pkw-arbeitsauftrag-routes";
import { germanToday, normalizeGermanDate } from "../../lib/dates";
import GermanDateField from "./GermanDateField";
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

type PendingRow = {
  key: string;
  manualId?: string;
  auftragNr: string;
  referenz: string;
  bezeichnung: string;
  stunden: string;
};

function displayToGermanDate(value: string) {
  return normalizeGermanDate(value) ?? "";
}

const MEINE_STUNDEN_PATH = "/arbeitsstunden/aus-auftraegen";

function entryEditHref(entry: AufgabenStundenEintrag) {
  if (entry.quelle === "manuell") return null;

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

function pendingStundenSum(rows: PendingRow[]) {
  return rows.reduce((sum, row) => sum + (parseStundenInput(row.stunden) ?? 0), 0);
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
  const [pendingByDay, setPendingByDay] = useState<Record<string, PendingRow[]>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

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
    setPendingByDay({});
    setLoading(false);
  }, [period, anchorDe, fromDe, toDe]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function addPendingRow(datum: string) {
    setPendingByDay((current) => ({
      ...current,
      [datum]: [
        ...(current[datum] ?? []),
        {
          key: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          auftragNr: "",
          referenz: "",
          bezeichnung: "",
          stunden: "",
        },
      ],
    }));
  }

  function updatePendingRow(datum: string, key: string, patch: Partial<PendingRow>) {
    setPendingByDay((current) => ({
      ...current,
      [datum]: (current[datum] ?? []).map((row) =>
        row.key === key ? { ...row, ...patch } : row
      ),
    }));
  }

  function removePendingRow(datum: string, key: string) {
    setPendingByDay((current) => ({
      ...current,
      [datum]: (current[datum] ?? []).filter((row) => row.key !== key),
    }));
  }

  function startEditManual(entry: AufgabenStundenEintrag) {
    if (!entry.manualId) return;
    setPendingByDay((current) => ({
      ...current,
      [entry.datum]: [
        ...(current[entry.datum] ?? []).filter((row) => row.manualId !== entry.manualId),
        {
          key: `edit-${entry.manualId}`,
          manualId: entry.manualId,
          auftragNr: entry.auftragNr === "—" ? "" : entry.auftragNr,
          referenz: entry.referenz === "—" ? "" : entry.referenz,
          bezeichnung: entry.bezeichnung === "—" ? "" : entry.bezeichnung,
          stunden: String(entry.stunden),
        },
      ],
    }));
  }

  async function savePendingRow(datum: string, row: PendingRow) {
    setSavingKey(row.key);
    setError(null);

    const response = await fetch("/api/arbeitsstunden/aus-auftraegen", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.manualId,
        datum,
        auftragNr: row.auftragNr,
        referenz: row.referenz,
        bezeichnung: row.bezeichnung,
        stunden: row.stunden,
      }),
    });
    const result = await response.json().catch(() => ({}));

    setSavingKey(null);

    if (!response.ok) {
      setError(result.error ?? "Speichern fehlgeschlagen.");
      return;
    }

    removePendingRow(datum, row.key);
    await loadData();
  }

  function dayDisplayTotal(tag: AufgabenStundenTag) {
    const pending = pendingByDay[tag.datum] ?? [];
    const editingIds = new Set(
      pending.filter((row) => row.manualId).map((row) => row.manualId as string)
    );
    const savedTotal = tag.eintraege
      .filter((entry) => !(entry.quelle === "manuell" && entry.manualId && editingIds.has(entry.manualId)))
      .reduce((sum, entry) => sum + entry.stunden, 0);
    return Math.round((savedTotal + pendingStundenSum(pending)) * 100) / 100;
  }

  const displayGesamtStunden = useMemo(() => {
    const pendingExtra = Object.entries(pendingByDay).reduce((sum, [datum, rows]) => {
      const tag = tage.find((item) => item.datum === datum);
      if (!tag) return sum + pendingStundenSum(rows);
      const editingIds = new Set(
        rows.filter((row) => row.manualId).map((row) => row.manualId as string)
      );
      const replaced = rows
        .filter((row) => row.manualId)
        .reduce((inner, row) => inner + (parseStundenInput(row.stunden) ?? 0), 0);
      const original = tag.eintraege
        .filter((entry) => entry.manualId && editingIds.has(entry.manualId))
        .reduce((inner, entry) => inner + entry.stunden, 0);
      const newRows = rows.filter((row) => !row.manualId);
      return sum + pendingStundenSum(newRows) + (replaced - original);
    }, 0);
    return Math.round((gesamtStunden + pendingExtra) * 100) / 100;
  }, [gesamtStunden, pendingByDay, tage]);

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
              <GermanDateField
                value={fromDisplay}
                onChange={(value) => {
                  const normalized = displayToGermanDate(value);
                  setFromDisplay(normalized ? toAustriaDateString(normalized) : value);
                }}
              />
            </label>
            <label className="arbeitsauftragFilterField">
              <span>Bis</span>
              <GermanDateField
                value={toDisplay}
                onChange={(value) => {
                  const normalized = displayToGermanDate(value);
                  setToDisplay(normalized ? toAustriaDateString(normalized) : value);
                }}
              />
            </label>
          </>
        ) : period === "alle" ? null : (
          <label className="arbeitsauftragFilterField">
            <span>{period === "tag" ? "Datum" : "Stichtag"}</span>
            <GermanDateField
              value={anchorDisplay}
              onChange={(value) => {
                const normalized = displayToGermanDate(value);
                setAnchorDisplay(normalized ? toAustriaDateString(normalized) : value);
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
                <b>{formatAufgabenStunden(displayGesamtStunden)} h</b>
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
            tage.map((tag) => {
              const pending = pendingByDay[tag.datum] ?? [];
              const editingIds = new Set(
                pending.filter((row) => row.manualId).map((row) => row.manualId as string)
              );
              const visibleEntries = tag.eintraege.filter(
                (entry) =>
                  !(entry.quelle === "manuell" && entry.manualId && editingIds.has(entry.manualId))
              );

              return (
                <article key={tag.datum} className="card usersPanel asAuftragDayCard">
                  <header className="asAuftragDayHead">
                    <div className="asAuftragDayTitleRow">
                      <h2>{tag.datum}</h2>
                      <button
                        type="button"
                        className="pillButton outline asAuftragAddBtn"
                        onClick={() => addPendingRow(tag.datum)}
                      >
                        + hinzufügen
                      </button>
                    </div>
                    <span className="asAuftragDayTotal">
                      {formatAufgabenStunden(dayDisplayTotal(tag))} h
                    </span>
                  </header>
                  <div className="machineTableScroll">
                    <table className="asEntriesTable">
                      <thead>
                        <tr>
                          <th>Auftrag</th>
                          <th>Referenz</th>
                          <th>Bezeichnung</th>
                          <th className="asAuftragHoursCol">Stunden</th>
                          <th className="asAuftragActionCol" aria-label="Aktion" />
                        </tr>
                      </thead>
                      <tbody>
                        {visibleEntries.map((entry) => {
                          const editHref = entryEditHref(entry);
                          return (
                            <tr key={`${entry.workOrderId}-${entry.quelle}`}>
                              <td>{entry.auftragNr}</td>
                              <td>{entry.referenz}</td>
                              <td>{entry.bezeichnung}</td>
                              <td className="asAuftragHoursCol">
                                {formatAufgabenStunden(entry.stunden)} h
                              </td>
                              <td className="asAuftragRowAction">
                                {editHref ? (
                                  <Link
                                    href={editHref}
                                    className="pillButton outline asAuftragEditBtn"
                                  >
                                    Bearbeiten
                                  </Link>
                                ) : (
                                  <button
                                    type="button"
                                    className="pillButton outline asAuftragEditBtn"
                                    onClick={() => startEditManual(entry)}
                                  >
                                    Bearbeiten
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {pending.map((row) => (
                          <tr key={row.key} className="asAuftragPendingRow">
                            <td>
                              <input
                                className="asAuftragCellInput"
                                value={row.auftragNr}
                                placeholder="Auftrag"
                                onChange={(event) =>
                                  updatePendingRow(tag.datum, row.key, {
                                    auftragNr: event.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <input
                                className="asAuftragCellInput"
                                value={row.referenz}
                                placeholder="Referenz"
                                onChange={(event) =>
                                  updatePendingRow(tag.datum, row.key, {
                                    referenz: event.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <input
                                className="asAuftragCellInput"
                                value={row.bezeichnung}
                                placeholder="Bezeichnung"
                                onChange={(event) =>
                                  updatePendingRow(tag.datum, row.key, {
                                    bezeichnung: event.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="asAuftragHoursCol">
                              <input
                                className="asAuftragCellInput asAuftragCellInputHours"
                                value={row.stunden}
                                placeholder="z. B. 1,5"
                                onChange={(event) =>
                                  updatePendingRow(tag.datum, row.key, {
                                    stunden: event.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="asAuftragRowAction">
                              <button
                                type="button"
                                className="pillButton primary asAuftragEditBtn"
                                disabled={savingKey === row.key}
                                onClick={() => void savePendingRow(tag.datum, row)}
                              >
                                {savingKey === row.key ? "…" : "Speichern"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
