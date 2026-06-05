"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import LagerFiltersBar from "../../components/LagerFiltersBar";
import AppPageShell from "../../components/AppPageShell";
import QrScannerModal from "../../components/QrScannerModal";
import {
  readInventurScanSession,
  type InventurScanSession,
} from "../../../lib/inventur-scan-session";
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
  const [scanSession, setScanSession] = useState<InventurScanSession | null>(null);
  const [scanImportActive, setScanImportActive] = useState(false);
  const [scanImportRequested, setScanImportRequested] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setScanImportRequested(params.get("import") === "scan");
  }, []);

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

  useEffect(() => {
    if (!scanImportRequested || loading) return;
    const session = readInventurScanSession();
    if (!session?.items.length) {
      setStatusMessage("Kein Scan-Import gefunden. Bitte erneut scannen.");
      return;
    }
    setScanSession(session);
    setScanImportActive(true);
    setStatusMessage(`${session.items.length} Teil(e) aus QR-Scan geladen.`);
  }, [scanImportRequested, loading]);

  function teilMatchesScan(teil: LagerTeil, scanValues: string[]) {
    const id = teil.id.toLowerCase();
    const hersteller = String(teil.herstellernummer ?? "").toLowerCase();
    const artikel = String(teil.artikelnummer ?? "").toLowerCase();
    return scanValues.some((scan) => {
      const lower = scan.toLowerCase();
      return lower === id || lower === hersteller || lower === artikel;
    });
  }

  const scanValues = useMemo(
    () => scanSession?.items.map((item) => item.herstellernummer) ?? [],
    [scanSession]
  );

  const filteredTeile = useMemo(() => {
    let rows = filterLagerTeileByFields(teile, filters);
    if (scanImportActive && scanValues.length > 0) {
      rows = rows.filter((teil) => teilMatchesScan(teil, scanValues));
    }
    return rows;
  }, [teile, filters, scanImportActive, scanValues]);

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
      activeHref="/lager/inventur"
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
            {scanImportActive && scanSession ? (
              <div className="scanImportBanner card">
                <p>
                  <strong>QR-Scan-Import:</strong> {scanSession.items.length} Code(s) — nur
                  passende Lager-Teile werden angezeigt.
                </p>
                <div className="scanFlowActions">
                  <button
                    type="button"
                    className="pillButton outline pillButtonSm"
                    onClick={() => setScanImportActive(false)}
                  >
                    Alle Teile anzeigen
                  </button>
                  <Link href="/inventur-scan" className="pillButton outline pillButtonSm">
                    Scan fortsetzen
                  </Link>
                </div>
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
                    {filteredTeile.length === 0 ? (
                      <tr>
                        <td colSpan={9}>Keine Teile gefunden.</td>
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
