"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InventurSessionSummary } from "../../../lib/lager-inventur-session";
import {
  applyInventurSession,
  fetchPendingInventurSessions,
  formatInventurSessionAge,
} from "../../../lib/lager-inventur-session";
import LagerFiltersBar from "../../components/LagerFiltersBar";
import AppPageShell from "../../components/AppPageShell";
import QrScannerModal from "../../components/QrScannerModal";
import {
  EMPTY_LAGER_FILTERS,
  fetchLagerTeile,
  filterLagerTeileByFields,
  formatLagerNumber,
  formatLagerValue,
  updateLagerTeil,
  type LagerListFilters,
} from "../../../lib/lager";
import { INVENTUR_NEU_PREFILL_KEY } from "../../../lib/lager-inventur-scan";
import type { LagerTeil } from "../../../lib/types/lager";

function formatInventurDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("de-AT");
}

function extractScanValue(raw: string) {
  const text = String(raw ?? "").trim();
  if (!text) return "";

  try {
    const url = new URL(text);
    const teilId = url.searchParams.get("teil");
    if (teilId) return teilId.trim();
  } catch {
    // Not a URL, continue with plain text.
  }

  return text;
}

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
  const [qrScanOpen, setQrScanOpen] = useState(false);
  const [scannedTeilOrder, setScannedTeilOrder] = useState<string[]>([]);
  const [pendingSessions, setPendingSessions] = useState<InventurSessionSummary[]>([]);
  const hadSessionPrefillRef = useRef(false);
  const adoptedSessionIdsRef = useRef<Set<string>>(new Set());

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
      try {
        const prefillRaw = sessionStorage.getItem(INVENTUR_NEU_PREFILL_KEY);
        if (prefillRaw) {
          hadSessionPrefillRef.current = true;
          sessionStorage.removeItem(INVENTUR_NEU_PREFILL_KEY);
          const prefill = JSON.parse(prefillRaw) as Record<string, string>;
          setScannedTeilOrder(Object.keys(prefill));
          for (const teil of rows) {
            if (prefill[teil.id] !== undefined) {
              initial[teil.id] = prefill[teil.id];
            }
          }
        } else {
          setScannedTeilOrder([]);
        }
      } catch {
        /* ignore invalid prefill */
        setScannedTeilOrder([]);
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

  const displayTeile = useMemo(() => {
    if (scannedTeilOrder.length === 0) return filteredTeile;

    const orderIndex = new Map(scannedTeilOrder.map((id, index) => [id, index]));
    const originalIndex = new Map(filteredTeile.map((teil, index) => [teil.id, index]));

    return [...filteredTeile].sort((a, b) => {
      const aOrder = orderIndex.get(a.id);
      const bOrder = orderIndex.get(b.id);
      const aScanned = aOrder !== undefined;
      const bScanned = bOrder !== undefined;

      if (aScanned && bScanned) return aOrder - bOrder;
      if (aScanned) return -1;
      if (bScanned) return 1;
      return (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0);
    });
  }, [filteredTeile, scannedTeilOrder]);

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

    const { data, error } = await updateLagerTeil(teil.id, {
      lagerstand: nextStand,
      last_inventur_at: new Date().toISOString(),
    });
    if (error) {
      setStatusMessage(error.message);
    } else if (data) {
      setTeile((current) => current.map((row) => (row.id === data.id ? data : row)));
      setCounts((current) => ({ ...current, [data.id]: String(data.lagerstand ?? 0) }));
      setStatusMessage(`Gespeichert: ${formatLagerValue(data.herstellernummer)} → ${data.lagerstand}`);
    }

    setSavingId(null);
  }

  const applyScanPrefill = useCallback(
    (order: string[], prefill: Record<string, string>) => {
      setScannedTeilOrder(order);
      setCounts((current) => {
        const next = { ...current };
        for (const teil of teile) {
          if (prefill[teil.id] !== undefined) {
            next[teil.id] = prefill[teil.id];
          }
        }
        return next;
      });
    },
    [teile]
  );

  const adoptInventurSession = useCallback(
    async (session: InventurSessionSummary) => {
      if (adoptedSessionIdsRef.current.has(session.id)) return;
      adoptedSessionIdsRef.current.add(session.id);
      applyScanPrefill(session.payload.order, session.payload.counts);
      const { error } = await applyInventurSession(session.id);
      if (error) {
        adoptedSessionIdsRef.current.delete(session.id);
        setStatusMessage(error.message);
        return;
      }
      setPendingSessions((current) => current.filter((row) => row.id !== session.id));
      setStatusMessage(
        `Mobiler Scan übernommen: ${session.teilCount} Teile · ${session.createdByUsername} · ${formatInventurSessionAge(session.createdAt)}`
      );
    },
    [applyScanPrefill]
  );

  const syncPendingInventurSessions = useCallback(
    async (autoApply: boolean) => {
      const { data, error, setupRequired, setupHint } = await fetchPendingInventurSessions();
      if (error && !setupRequired) {
        setStatusMessage(error.message);
        return;
      }
      if (setupRequired) {
        setPendingSessions([]);
        if (setupHint) {
          setStatusMessage(setupHint);
        }
        return;
      }
      setPendingSessions(data);
      if (!autoApply || hadSessionPrefillRef.current || data.length === 0) return;
      const newest = data.find((session) => !adoptedSessionIdsRef.current.has(session.id));
      if (newest) {
        await adoptInventurSession(newest);
      }
    },
    [adoptInventurSession]
  );

  useEffect(() => {
    if (!permissionsLoaded || !canRead || loading || teile.length === 0) return;
    void syncPendingInventurSessions(true);
  }, [permissionsLoaded, canRead, loading, teile.length, syncPendingInventurSessions]);

  useEffect(() => {
    if (!permissionsLoaded || !canRead || loading) return;
    const timer = window.setInterval(() => {
      void syncPendingInventurSessions(true);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [permissionsLoaded, canRead, loading, syncPendingInventurSessions]);

  function handleQrScan(decoded: string) {
    const scan = extractScanValue(decoded);
    if (!scan) return;

    const byId = teile.find((teil) => teil.id === scan);
    if (byId) {
      setFilters((current) => ({
        ...current,
        artikelnummer: byId.artikelnummer ?? "",
        herstellernummer: byId.herstellernummer ?? "",
      }));
      setStatusMessage(`QR erkannt: ${byId.herstellernummer}`);
      return;
    }

    const lower = scan.toLowerCase();
    const byNumbers = teile.find(
      (teil) =>
        String(teil.herstellernummer ?? "").toLowerCase() === lower ||
        String(teil.artikelnummer ?? "").toLowerCase() === lower
    );
    if (byNumbers) {
      setFilters((current) => ({
        ...current,
        artikelnummer: byNumbers.artikelnummer ?? "",
        herstellernummer: byNumbers.herstellernummer ?? "",
      }));
      setStatusMessage(`QR erkannt: ${byNumbers.herstellernummer}`);
      return;
    }

    setFilters((current) => ({ ...current, herstellernummer: scan }));
    setStatusMessage(`QR erkannt: ${scan}`);
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
            <button
              type="button"
              className="pillButton outline"
              onClick={() => setQrScanOpen(true)}
            >
              QR scannen
            </button>
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
            {pendingSessions.length > 0 ? (
              <div className="welcomeCard" style={{ marginBottom: 12 }}>
                <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Offene mobile Scans</h2>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {pendingSessions.map((session) => (
                    <li key={session.id} style={{ marginBottom: 8 }}>
                      {session.teilCount} Teile · {session.createdByUsername} ·{" "}
                      {formatInventurSessionAge(session.createdAt)}
                      <button
                        type="button"
                        className="pillButton outline"
                        style={{ marginLeft: 10 }}
                        onClick={() => void adoptInventurSession(session)}
                      >
                        Übernehmen
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

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
                      <th>Artikelnummer</th>
                      <th>Herstellernummer</th>
                      <th>Ersatzteil</th>
                      <th>Lagerort</th>
                      <th>Lagerplatz</th>
                      <th>Ist</th>
                      <th>Letzte Inventur</th>
                      <th>Neu</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {displayTeile.length === 0 ? (
                      <tr>
                        <td colSpan={9}>Keine Teile gefunden.</td>
                      </tr>
                    ) : (
                      displayTeile.map((teil) => {
                        const countValue = counts[teil.id] ?? String(teil.lagerstand ?? 0);
                        const parsed = Number(String(countValue).replace(",", "."));
                        const changed =
                          Number.isFinite(parsed) &&
                          parsed !== Number(teil.lagerstand ?? 0);

                        return (
                          <tr key={teil.id}>
                            <td>{formatLagerValue(teil.artikelnummer)}</td>
                            <td>
                              <strong>{formatLagerValue(teil.herstellernummer)}</strong>
                            </td>
                            <td className="lagerBezeichnungCell">
                              {teil.bezeichnung?.trim() || "—"}
                            </td>
                            <td>{formatLagerValue(teil.lagerort)}</td>
                            <td>{formatLagerValue(teil.lagerplatz)}</td>
                            <td>{formatLagerNumber(teil.lagerstand)}</td>
                            <td>{formatInventurDate(teil.last_inventur_at)}</td>
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
      <QrScannerModal
        open={qrScanOpen}
        onClose={() => setQrScanOpen(false)}
        onScan={handleQrScan}
      />
    </AppPageShell>
  );
}
