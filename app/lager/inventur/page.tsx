"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import LagerFiltersBar from "../../components/LagerFiltersBar";
import AppPageShell from "../../components/AppPageShell";
import {
  EMPTY_LAGER_FILTERS,
  fetchLagerTeile,
  filterLagerTeileByFields,
  formatLagerNumber,
  formatLagerValue,
  updateLagerTeil,
  type LagerListFilters,
} from "../../../lib/lager";
import type { LagerTeil } from "../../../lib/types/lager";

export default function LagerInventurPage() {
  const [teile, setTeile] = useState<LagerTeil[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LagerListFilters>(EMPTY_LAGER_FILTERS);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canRead, setCanRead] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadTeile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await fetchLagerTeile();
    if (error) {
      setLoadError(error.message);
      setTeile([]);
      setCounts({});
    } else {
      const rows = data ?? [];
      setTeile(rows);
      const initial: Record<string, string> = {};
      for (const teil of rows) {
        initial[teil.id] = String(teil.lagerstand ?? 0);
      }
      setCounts(initial);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function loadPermissions() {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "include",
      });
      const result = await response.json().catch(() => ({}));
      const permissions = result.permissions ?? [];
      setCanRead(permissions.includes("warehouse.read"));
      setCanWrite(permissions.includes("warehouse.write"));
      setPermissionsLoaded(true);
    }

    loadPermissions();
  }, []);

  useEffect(() => {
    if (!permissionsLoaded) return;
    if (!canRead) {
      setLoading(false);
      return;
    }
    loadTeile();
  }, [permissionsLoaded, canRead, loadTeile]);

  const filteredTeile = useMemo(
    () => filterLagerTeileByFields(teile, filters),
    [teile, filters]
  );

  function updateCount(teilId: string, value: string) {
    setCounts((current) => ({ ...current, [teilId]: value }));
  }

  async function saveCount(teil: LagerTeil) {
    if (!canWrite) return;

    const raw = counts[teil.id] ?? "";
    const nextStand = Number(String(raw).replace(",", "."));
    if (!Number.isFinite(nextStand) || nextStand < 0) {
      setStatusMessage("Ungültiger Lagerstand.");
      return;
    }

    setSavingId(teil.id);
    setStatusMessage(null);

    const { data, error } = await updateLagerTeil(teil.id, { lagerstand: nextStand });
    if (error) {
      setStatusMessage(error.message);
    } else if (data) {
      setTeile((current) => current.map((row) => (row.id === data.id ? data : row)));
      setCounts((current) => ({ ...current, [data.id]: String(data.lagerstand ?? 0) }));
      setStatusMessage(`Gespeichert: ${formatLagerValue(data.herstellernummer)} → ${data.lagerstand}`);
    }

    setSavingId(null);
  }

  return (
    <AppPageShell
      activeHref="/lager"
      top={
        <header className="pageHeader compactPageHeader">
          <div>
            <h1 style={{ margin: 0 }}>Inventur</h1>
            <p className="subtitle" style={{ margin: "6px 0 0" }}>
              Lagerstand prüfen und speichern.
            </p>
          </div>
          <div className="detailTopActions">
            <Link href="/lager" className="pillButton outline">
              Zurück zum Lager
            </Link>
          </div>
        </header>
      }
    >
        {permissionsLoaded && !canRead ? (
          <div className="welcomeCard">
            <h2>Kein Zugriff</h2>
            <p>Berechtigung <code>warehouse.read</code> erforderlich.</p>
          </div>
        ) : loading ? (
          <div className="welcomeCard">
            <h2>Laden…</h2>
          </div>
        ) : loadError ? (
          <div className="welcomeCard">
            <h2>Fehler</h2>
            <p>{loadError}</p>
          </div>
        ) : (
          <>
            {statusMessage ? (
              <p className="protocolNotice" role="status">
                {statusMessage}
              </p>
            ) : null}

            <LagerFiltersBar
              filters={filters}
              onChange={setFilters}
              matchCount={filteredTeile.length}
              totalCount={teile.length}
            />

            <article className="card machineTableWrap lagerErsatzteileCard">
              <div className="machineTableScroll">
                <table className="machineTable lagerTable lagerInventurTable">
                  <thead>
                    <tr>
                      <th>Herstellernummer</th>
                      <th>Ersatzteil</th>
                      <th>Lagerort</th>
                      <th>Lagerplatz</th>
                      <th>Ist</th>
                      <th>Neu</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeile.length === 0 ? (
                      <tr>
                        <td colSpan={7}>Keine Teile gefunden.</td>
                      </tr>
                    ) : (
                      filteredTeile.map((teil) => {
                        const countValue = counts[teil.id] ?? String(teil.lagerstand ?? 0);
                        const parsed = Number(String(countValue).replace(",", "."));
                        const changed =
                          Number.isFinite(parsed) &&
                          parsed !== Number(teil.lagerstand ?? 0);

                        return (
                          <tr key={teil.id}>
                            <td>
                              <strong>{formatLagerValue(teil.herstellernummer)}</strong>
                            </td>
                            <td className="lagerBezeichnungCell">
                              {teil.bezeichnung?.trim() || "—"}
                            </td>
                            <td>{formatLagerValue(teil.lagerort)}</td>
                            <td>{formatLagerValue(teil.lagerplatz)}</td>
                            <td>{formatLagerNumber(teil.lagerstand)}</td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                className="lagerInventurInput"
                                value={countValue}
                                disabled={!canWrite || savingId === teil.id}
                                onChange={(event) => updateCount(teil.id, event.target.value)}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className="pillButton outline"
                                disabled={!canWrite || savingId === teil.id || !changed}
                                onClick={() => saveCount(teil)}
                              >
                                {savingId === teil.id ? "…" : "Speichern"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
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
