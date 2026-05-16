"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import "../arbeitsstunden/arbeitsstunden.css";
import {
  ARBEITSZEIT_BIS,
  ARBEITSZEIT_VON,
  SOLL_STUNDEN_PRO_TAG,
  formatStunden,
  isoToday,
  periodRange,
  type AggregateRow,
  type ArbeitsstundenEintrag,
  type ArbeitsstundenTagesabschluss,
  type DaySummary,
  type PeriodKind,
} from "../../lib/arbeitsstunden";
import { toAustriaDateString } from "../../lib/machines";

type Tab = "tag" | "liste" | "vergleich";

type DayResponse = {
  datum: string;
  username: string;
  eintraege: ArbeitsstundenEintrag[];
  summary: DaySummary;
  abschluss: ArbeitsstundenTagesabschluss | null;
  tage?: DaySummary[];
  allUsers?: boolean;
  error?: string;
  needsMigration?: boolean;
};

function isoToDisplay(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function displayToIso(value: string) {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export default function ArbeitsstundenDashboard() {
  const [tab, setTab] = useState<Tab>("tag");
  const [period, setPeriod] = useState<PeriodKind>("woche");
  const [datum, setDatum] = useState(isoToday());
  const [datumDisplay, setDatumDisplay] = useState(
    toAustriaDateString(new Date().toISOString().slice(0, 10))
  );
  const [username, setUsername] = useState("");
  const [sessionUsername, setSessionUsername] = useState("");
  const [canAdmin, setCanAdmin] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [depot, setDepot] = useState("");
  const [notiz, setNotiz] = useState("");
  const [bestaetigt, setBestaetigt] = useState(false);

  const [dayData, setDayData] = useState<DayResponse | null>(null);
  const [liste, setListe] = useState<DaySummary[]>([]);
  const [compareRows, setCompareRows] = useState<AggregateRow[]>([]);
  const [compareBy, setCompareBy] = useState<"username" | "depot">("username");

  const [manualStunden, setManualStunden] = useState("");
  const [manualText, setManualText] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeUser = username || sessionUsername;
  const adminAllUsersMode = canAdmin && !username.trim();

  const range = useMemo(() => periodRange(period, datum), [period, datum]);

  const loadSession = useCallback(async () => {
    const res = await fetch("/api/auth/session", { cache: "no-store", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    const name = data.user?.username ?? "";
    setSessionUsername(name);
    setUsername(name);
    const perms: string[] = data.permissions ?? [];
    setCanAdmin(
      name.toLowerCase() === "admin" || perms.includes("hours.admin")
    );
    setCanWrite(
      name.toLowerCase() === "admin" ||
        perms.includes("hours.write") ||
        perms.includes("machines.write")
    );
    if (name.toLowerCase() === "admin" || perms.includes("hours.admin")) {
      setUsername("");
    }
  }, []);

  const autoSyncAdminToday = useCallback(async () => {
    if (!canAdmin || datum !== isoToday()) return;
    await fetch("/api/arbeitsstunden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: "sync_all",
        datum,
      }),
    });
  }, [canAdmin, datum]);

  const loadDay = useCallback(async () => {
    const params = new URLSearchParams({ mode: "tag", datum });
    if (username.trim()) {
      params.set("username", username);
    }
    const res = await fetch(`/api/arbeitsstunden?${params}`, {
      cache: "no-store",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Laden fehlgeschlagen.");
      setDayData(null);
      return;
    }
    setError(null);
    setDayData(data as DayResponse);
    if (!data.allUsers) {
      setDepot(data.abschluss?.depot ?? data.summary?.depot ?? "");
      setNotiz(data.abschluss?.notiz ?? "");
      setBestaetigt(Boolean(data.abschluss?.bestaetigt));
    }
  }, [datum, username, sessionUsername]);

  const loadListe = useCallback(async () => {
    const params = new URLSearchParams({
      mode: "liste",
      from: range.from,
      to: range.to,
    });
    if (username.trim() && canAdmin) params.set("username", username);

    const res = await fetch(`/api/arbeitsstunden?${params}`, {
      cache: "no-store",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Liste konnte nicht geladen werden.");
      setListe([]);
      return;
    }
    setError(null);
    setListe(data.tage ?? []);
  }, [range.from, range.to, username, canAdmin]);

  const loadCompare = useCallback(async () => {
    const params = new URLSearchParams({
      mode: "vergleich",
      from: range.from,
      to: range.to,
      groupBy: compareBy,
    });
    const res = await fetch(`/api/arbeitsstunden?${params}`, {
      cache: "no-store",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Vergleich fehlgeschlagen.");
      setCompareRows([]);
      return;
    }
    setError(null);
    setCompareRows(data.rows ?? []);
  }, [range.from, range.to, compareBy]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!sessionUsername) return;
    setLoading(true);
    setMessage(null);

    async function load() {
      await autoSyncAdminToday();
      if (tab === "tag") await loadDay();
      else if (tab === "liste") await loadListe();
      else await loadCompare();
      setLoading(false);
    }

    load();
  }, [tab, loadDay, loadListe, loadCompare, sessionUsername, autoSyncAdminToday]);

  useEffect(() => {
    if (!sessionUsername) return;
    const timer = window.setInterval(async () => {
      if (busy || loading) return;
      if (tab === "tag") {
        await autoSyncAdminToday();
        await loadDay();
      } else if (tab === "liste") {
        await autoSyncAdminToday();
        await loadListe();
      } else {
        await loadCompare();
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [
    sessionUsername,
    tab,
    busy,
    loading,
    autoSyncAdminToday,
    loadDay,
    loadListe,
    loadCompare,
  ]);

  function onDatumDisplayChange(value: string) {
    setDatumDisplay(value);
    const iso = displayToIso(value);
    if (iso) setDatum(iso);
  }

  async function syncProtokolle() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/arbeitsstunden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: "sync",
        datum,
        username: activeUser,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Synchronisation fehlgeschlagen.");
      return;
    }
    setMessage(`${data.imported ?? 0} Protokoll-Einträge übernommen.`);
    await loadDay();
  }

  async function addManual() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/arbeitsstunden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: "manual",
        datum,
        username: activeUser,
        depot,
        stunden: manualStunden,
        beschreibung: manualText,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Eintrag fehlgeschlagen.");
      return;
    }
    setManualStunden("");
    setManualText("");
    setMessage("Manueller Eintrag gespeichert.");
    await loadDay();
  }

  async function deleteEntry(id: string) {
    setBusy(true);
    const res = await fetch(`/api/arbeitsstunden/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Löschen fehlgeschlagen.");
      return;
    }
    await loadDay();
  }

  async function confirmDay() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/arbeitsstunden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: "confirm",
        datum,
        username: activeUser,
        depot,
        notiz,
        bestaetigt,
        sollStunden: SOLL_STUNDEN_PRO_TAG,
        arbeitszeitVon: ARBEITSZEIT_VON,
        arbeitszeitBis: ARBEITSZEIT_BIS,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Bestätigung fehlgeschlagen.");
      return;
    }
    setMessage(bestaetigt ? "Tagesabschluss gespeichert." : "Notiz gespeichert.");
    await loadDay();
  }

  function handlePrint() {
    document.body.classList.add("asHoursPrinting");
    window.print();
    window.setTimeout(() => document.body.classList.remove("asHoursPrinting"), 500);
  }

  const summary = dayData?.summary;
  const maxCompare = Math.max(...compareRows.map((r) => r.gesamtStunden), 1);

  return (
    <>
      <div className="asHoursScreen">
        <nav className="asHoursTabs asHoursNoPrint">
          <button
            type="button"
            className={tab === "tag" ? "active" : undefined}
            onClick={() => setTab("tag")}
          >
            Tagesblatt
          </button>
          <button
            type="button"
            className={tab === "liste" ? "active" : undefined}
            onClick={() => setTab("liste")}
          >
            Listen
          </button>
          <button
            type="button"
            className={tab === "vergleich" ? "active" : undefined}
            onClick={() => setTab("vergleich")}
          >
            Vergleich
          </button>
        </nav>

        <div className="arbeitsauftragFilters asHoursNoPrint">
          {tab === "tag" ? (
            <label className="arbeitsauftragFilterField">
              <span>Datum</span>
              <input
                type="text"
                value={datumDisplay}
                placeholder="TT.MM.JJJJ"
                onChange={(e) => onDatumDisplayChange(e.target.value)}
              />
            </label>
          ) : (
            <>
              <label className="arbeitsauftragFilterField">
                <span>Zeitraum</span>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as PeriodKind)}
                >
                  <option value="tag">Tag</option>
                  <option value="woche">Woche</option>
                  <option value="monat">Monat</option>
                  <option value="jahr">Jahr</option>
                </select>
              </label>
              <label className="arbeitsauftragFilterField">
                <span>Stichtag</span>
                <input
                  type="text"
                  value={datumDisplay}
                  placeholder="TT.MM.JJJJ"
                  onChange={(e) => onDatumDisplayChange(e.target.value)}
                />
              </label>
            </>
          )}

          {canAdmin ? (
            <label className="arbeitsauftragFilterField">
              <span>Bearbeiter</span>
              <input
                type="search"
                value={username}
                placeholder="leer = alle"
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
          ) : null}

          {tab === "tag" ? (
            <label className="arbeitsauftragFilterField">
              <span>Werkstatt / Filiale</span>
              <input
                type="text"
                value={depot}
                placeholder="Depot"
                onChange={(e) => setDepot(e.target.value)}
              />
            </label>
          ) : null}

          {tab === "tag" ? (
            <>
              <button
                type="button"
                className="pillButton outline"
                disabled={busy || !canWrite}
                onClick={syncProtokolle}
              >
                Protokolle übernehmen
              </button>
              <button
                type="button"
                className="pillButton outline"
                onClick={handlePrint}
              >
                Tagesblatt drucken
              </button>
            </>
          ) : null}
        </div>

        {tab !== "tag" ? (
          <p className="scanHint asHoursNoPrint">
            Zeitraum: {isoToDisplay(range.from)} – {isoToDisplay(range.to)}
          </p>
        ) : null}

        {loading ? <p className="scanHint">Laden…</p> : null}
        {error ? <p className="protocolNotice">{error}</p> : null}
        {message ? <p className="protocolNotice success">{message}</p> : null}

        {tab === "tag" && !loading && summary && !adminAllUsersMode ? (
          <section className="protocolSection card">
            <p className="scanHint">
              Soll-Arbeitszeit: {ARBEITSZEIT_VON}–{ARBEITSZEIT_BIS} ({formatStunden(SOLL_STUNDEN_PRO_TAG)} h)
            </p>

            <div className="asDayGrid">
              <div className="asStatCard">
                <strong>Protokolle</strong>
                <b>{formatStunden(summary.protokollStunden)} h</b>
              </div>
              <div className="asStatCard">
                <strong>Manuell</strong>
                <b>{formatStunden(summary.manuellStunden)} h</b>
              </div>
              <div className={`asStatCard ${summary.differenz >= 0 ? "ok" : "warn"}`}>
                <strong>Gesamt / Soll</strong>
                <b>
                  {formatStunden(summary.gesamtStunden)} / {formatStunden(summary.sollStunden)} h
                </b>
              </div>
              <div className={`asStatCard ${summary.differenz >= 0 ? "ok" : "warn"}`}>
                <strong>Differenz</strong>
                <b>
                  {summary.differenz >= 0 ? "+" : ""}
                  {formatStunden(summary.differenz)} h
                </b>
              </div>
            </div>

            <table className="asEntriesTable">
              <thead>
                <tr>
                  <th>Quelle</th>
                  <th>Beschreibung</th>
                  <th>Stunden</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(dayData?.eintraege ?? []).map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <span className={`asQuelleBadge ${entry.quelle}`}>{entry.quelle}</span>
                    </td>
                    <td>{entry.beschreibung}</td>
                    <td>{formatStunden(entry.stunden)}</td>
                    <td>
                      {entry.quelle === "manuell" && canWrite ? (
                        <button
                          type="button"
                          className="pillButton outline"
                          disabled={busy}
                          onClick={() => deleteEntry(entry.id)}
                        >
                          Entfernen
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {canWrite ? (
              <form
                className="arbeitsauftragFilters"
                style={{ marginTop: 16 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  addManual();
                }}
              >
                <label className="arbeitsauftragFilterField">
                  <span>Manuell (Stunden)</span>
                  <input
                    value={manualStunden}
                    placeholder="z. B. 1,5"
                    onChange={(e) => setManualStunden(e.target.value)}
                  />
                </label>
                <label className="arbeitsauftragFilterField">
                  <span>Beschreibung</span>
                  <input
                    value={manualText}
                    placeholder="z. B. Fahrt, Schulung"
                    onChange={(e) => setManualText(e.target.value)}
                  />
                </label>
                <button type="submit" className="pillButton primary" disabled={busy}>
                  Hinzufügen
                </button>
              </form>
            ) : null}

            <section style={{ marginTop: 20 }}>
              <h2 className="spacedTitle">Tagesabschluss</h2>
              <label className="protocolField">
                <input
                  type="checkbox"
                  checked={bestaetigt}
                  disabled={!canWrite}
                  onChange={(e) => setBestaetigt(e.target.checked)}
                />{" "}
                Ich bestätige, dass ich die Arbeitszeit am {isoToDisplay(datum)} ({ARBEITSZEIT_VON}–
                {ARBEITSZEIT_BIS}) ordnungsgemäß erfasst habe.
              </label>
              <label className="protocolField textAreas" style={{ marginTop: 12 }}>
                <span>Notiz</span>
                <textarea
                  rows={3}
                  value={notiz}
                  readOnly={!canWrite}
                  onChange={(e) => setNotiz(e.target.value)}
                />
              </label>
              {canWrite ? (
                <button
                  type="button"
                  className="pillButton primary"
                  style={{ marginTop: 12 }}
                  disabled={busy}
                  onClick={confirmDay}
                >
                  Abschluss speichern
                </button>
              ) : null}
            </section>
          </section>
        ) : null}

        {tab === "tag" && !loading && adminAllUsersMode ? (
          <section className="protocolSection card">
            <p className="scanHint">
              Live-Übersicht heute ({isoToDisplay(datum)}), aktualisiert alle 30 Sekunden.
            </p>
            <table className="asEntriesTable">
              <thead>
                <tr>
                  <th>Bearbeiter</th>
                  <th>Werkstatt</th>
                  <th>Protokoll</th>
                  <th>Manuell</th>
                  <th>Gesamt</th>
                  <th>Soll</th>
                  <th>Diff.</th>
                  <th>Bestätigt</th>
                </tr>
              </thead>
              <tbody>
                {(dayData?.tage ?? []).map((row) => (
                  <tr key={`${row.username}-${row.datum}`}>
                    <td>{row.username}</td>
                    <td>{row.depot || "—"}</td>
                    <td>{formatStunden(row.protokollStunden)}</td>
                    <td>{formatStunden(row.manuellStunden)}</td>
                    <td>{formatStunden(row.gesamtStunden)}</td>
                    <td>{formatStunden(row.sollStunden)}</td>
                    <td>{formatStunden(row.differenz)}</td>
                    <td>{row.bestaetigt ? "Ja" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {tab === "liste" && !loading ? (
          <section className="protocolSection card">
            <table className="asEntriesTable">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Bearbeiter</th>
                  <th>Werkstatt</th>
                  <th>Protokoll</th>
                  <th>Manuell</th>
                  <th>Gesamt</th>
                  <th>Soll</th>
                  <th>Diff.</th>
                  <th>Bestätigt</th>
                </tr>
              </thead>
              <tbody>
                {liste.map((row) => (
                  <tr key={`${row.username}-${row.datum}`}>
                    <td>{isoToDisplay(row.datum)}</td>
                    <td>{row.username}</td>
                    <td>{row.depot || "—"}</td>
                    <td>{formatStunden(row.protokollStunden)}</td>
                    <td>{formatStunden(row.manuellStunden)}</td>
                    <td>{formatStunden(row.gesamtStunden)}</td>
                    <td>{formatStunden(row.sollStunden)}</td>
                    <td>{formatStunden(row.differenz)}</td>
                    <td>{row.bestaetigt ? "Ja" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {tab === "vergleich" && !loading ? (
          <section className="protocolSection card">
            <div className="asHoursTabs">
              <button
                type="button"
                className={compareBy === "username" ? "active" : undefined}
                onClick={() => setCompareBy("username")}
              >
                Bearbeiter
              </button>
              <button
                type="button"
                className={compareBy === "depot" ? "active" : undefined}
                onClick={() => setCompareBy("depot")}
              >
                Werkstätten
              </button>
            </div>

            <div className="asCompareBars">
              {compareRows.map((row) => (
                <div key={row.key} className="asCompareRow">
                  <strong>{row.label}</strong>
                  <div className="asCompareBarTrack">
                    <div
                      className="asCompareBarFill"
                      style={{ width: `${(row.gesamtStunden / maxCompare) * 100}%` }}
                    />
                  </div>
                  <span>
                    {formatStunden(row.gesamtStunden)} h
                    <br />
                    <small>
                      Soll {formatStunden(row.sollStunden)} · {row.bestaetigteTage} bestätigt
                    </small>
                  </span>
                </div>
              ))}
            </div>

            <table className="asEntriesTable" style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th>{compareBy === "depot" ? "Werkstatt" : "Bearbeiter"}</th>
                  <th>Protokoll</th>
                  <th>Manuell</th>
                  <th>Gesamt</th>
                  <th>Soll ({period})</th>
                  <th>Differenz</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.label}</td>
                    <td>{formatStunden(row.protokollStunden)}</td>
                    <td>{formatStunden(row.manuellStunden)}</td>
                    <td>{formatStunden(row.gesamtStunden)}</td>
                    <td>{formatStunden(row.sollStunden)}</td>
                    <td>{formatStunden(row.differenz)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </div>

      {tab === "tag" && summary ? (
        <article className="asPrintSheet">
          <h1>Arbeitsstunden Tagesblatt</h1>
          <p>
            {activeUser} · {isoToDisplay(datum)} · {depot || "—"} · {ARBEITSZEIT_VON}–
            {ARBEITSZEIT_BIS}
          </p>
          <p>
            Protokoll: {formatStunden(summary.protokollStunden)} h · Manuell:{" "}
            {formatStunden(summary.manuellStunden)} h · Gesamt:{" "}
            {formatStunden(summary.gesamtStunden)} h · Soll: {formatStunden(summary.sollStunden)} h
          </p>
          <table className="asEntriesTable">
            <thead>
              <tr>
                <th>Quelle</th>
                <th>Beschreibung</th>
                <th>Stunden</th>
              </tr>
            </thead>
            <tbody>
              {(dayData?.eintraege ?? []).map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.quelle}</td>
                  <td>{entry.beschreibung}</td>
                  <td>{formatStunden(entry.stunden)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: 24 }}>
            Bestätigung: {bestaetigt ? "Ja" : "Nein"}
            {notiz ? ` · Notiz: ${notiz}` : ""}
          </p>
          <p>Unterschrift: _________________________</p>
        </article>
      ) : null}
    </>
  );
}
