"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppPageShell from "../components/AppPageShell";
import { useLocalhostOnly } from "../hooks/useLocalhostOnly";
import {
  deleteRechnung,
  fetchRechnungen,
  formatEuro,
  formatKundeLabel,
  formatRechnungDate,
} from "../../lib/rechnung";
import type { RechnungListItem } from "../../lib/types/rechnung";

export default function RechnungenPage() {
  const state = useLocalhostOnly();
  const router = useRouter();
  const [rows, setRows] = useState<RechnungListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error: loadError } = await fetchRechnungen();
    setLoading(false);
    if (loadError) {
      setError(loadError);
      setRows([]);
      return;
    }
    setError(null);
    setRows(data?.rechnungen ?? []);
  }

  useEffect(() => {
    if (state !== "ready") return;
    void load();
  }, [state]);

  async function handleDelete(id: string, nr: string) {
    if (!window.confirm(`Rechnung ${nr} löschen?`)) return;
    const { error: delError } = await deleteRechnung(id);
    if (delError) {
      setError(delError);
      return;
    }
    void load();
  }

  if (state === "pending" || state === "blocked") {
    return (
      <AppPageShell activeHref="/rechnungen" subtitle="Rechnungen" title="Rechnungen">
        <div className="welcomeCard">
          <p>{state === "pending" ? "Laden…" : "Nur localhost verfügbar."}</p>
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell activeHref="/rechnungen" subtitle="Rechnungen" title="Rechnungen">
      <div className="welcomeCard rechnungListPage">
        <div className="detailTopActions">
          <h1>Rechnungen</h1>
          <Link href="/rechnungen/neu" className="pillButton">
            Neu
          </Link>
        </div>
        <p className="subtitle">Nur localhost — Entwürfe und Rechnungen verwalten.</p>

        {error ? <p className="formError">{error}</p> : null}
        {loading ? <p>Laden…</p> : null}

        {!loading && rows.length === 0 ? <p>Noch keine Rechnungen.</p> : null}

        {rows.length > 0 ? (
          <div className="rechnungListWrap">
            <table className="rechnungListTable">
              <thead>
                <tr>
                  <th>Re-Nr.</th>
                  <th>Datum</th>
                  <th>Kunde</th>
                  <th>Kennzeichen</th>
                  <th>Betrag</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/rechnungen/${row.id}`}>{row.rechnungs_nr}</Link>
                    </td>
                    <td>{formatRechnungDate(row.belegdatum)}</td>
                    <td>{formatKundeLabel(row.kunde_snapshot)}</td>
                    <td>{row.fahrzeug_snapshot?.kennzeichen ?? "—"}</td>
                    <td>{formatEuro(row.rechnungsbetrag)}</td>
                    <td>{row.status}</td>
                    <td className="rechnungListActions">
                      <Link href={`/rechnungen/${row.id}/print`} className="linkButton">
                        Druck
                      </Link>
                      <button
                        type="button"
                        className="linkButton"
                        onClick={() => router.push(`/rechnungen/${row.id}`)}
                      >
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        className="linkButton"
                        onClick={() => void handleDelete(row.id, row.rechnungs_nr)}
                      >
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </AppPageShell>
  );
}
