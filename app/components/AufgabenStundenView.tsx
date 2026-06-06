"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatAufgabenStunden,
  type AufgabenStundenTag,
} from "../../lib/aufgaben-arbeitsstunden";
import "../arbeitsstunden/arbeitsstunden.css";

type StundenResponse = {
  username: string;
  gesamtStunden: number;
  tage: AufgabenStundenTag[];
  error?: string;
};

export default function AufgabenStundenView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [gesamtStunden, setGesamtStunden] = useState(0);
  const [tage, setTage] = useState<AufgabenStundenTag[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/aufgaben/stunden", {
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
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="welcomeCard">
        <h2>Laden…</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="welcomeCard">
        <h2>Fehler</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="aufgabenStundenPage">
      <article className="card usersPanel aufgabenSummaryCard">
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
          <p>Keine Arbeitsstunden in Arbeitsaufträgen gefunden.</p>
        </div>
      ) : (
        tage.map((tag) => (
          <article key={tag.datum} className="card usersPanel aufgabenDayCard">
            <header className="aufgabenDayHead">
              <h2>{tag.datum}</h2>
              <span className="aufgabenDayTotal">{formatAufgabenStunden(tag.gesamtStunden)} h</span>
            </header>
            <div className="machineTableScroll">
              <table className="asEntriesTable">
                <thead>
                  <tr>
                    <th>Auftrag</th>
                    <th>Typ</th>
                    <th>Referenz</th>
                    <th>Bezeichnung</th>
                    <th>Stunden</th>
                  </tr>
                </thead>
                <tbody>
                  {tag.eintraege.map((entry) => (
                    <tr key={`${entry.workOrderId}-${entry.quelle}`}>
                      <td>{entry.auftragNr}</td>
                      <td>{entry.auftragTyp}</td>
                      <td>{entry.referenz}</td>
                      <td>{entry.bezeichnung}</td>
                      <td>{formatAufgabenStunden(entry.stunden)} h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
