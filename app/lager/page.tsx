"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import LagerBestandBadge from "../components/LagerBestandBadge";
import LagerMengeMinCell from "../components/LagerMengeMinCell";
import LagerFiltersBar from "../components/LagerFiltersBar";
import LagerTeilBild from "../components/LagerTeilBild";
import LagerTeilModal from "../components/LagerTeilModal";
import AppPageShell from "../components/AppPageShell";
import {
  fetchLagerMeldungenSummary,
  deleteLagerTeil,
  EMPTY_LAGER_FILTERS,
  fetchLagerTeile,
  filterLagerTeileByFields,
  formatLagerCurrency,
  formatLagerNumber,
  formatLagerValue,
  getLagerBestandAlert,
  type LagerListFilters,
} from "../../lib/lager";
import type { LagerTeil } from "../../lib/types/lager";

function LagerPageContent() {
  const searchParams = useSearchParams();
  const [teile, setTeile] = useState<LagerTeil[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LagerListFilters>(EMPTY_LAGER_FILTERS);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canRead, setCanRead] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeil, setSelectedTeil] = useState<LagerTeil | null>(null);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const loadTeile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const { data, error } = await fetchLagerTeile();
    if (error) {
      setLoadError(error.message);
      setTeile([]);
    } else {
      setTeile(data ?? []);
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

  const [meldungenCount, setMeldungenCount] = useState(0);

  useEffect(() => {
    if (!canRead) return;
    fetchLagerMeldungenSummary().then(({ data }) => {
      if (data) setMeldungenCount(data.total);
    });
  }, [canRead, teile]);

  useEffect(() => {
    const teilId = searchParams.get("teil")?.trim();
    if (!teilId || loading || !teile.length) return;
    const hit = teile.find((t) => t.id === teilId);
    if (hit) {
      setSelectedTeil(hit);
      setModalOpen(true);
    }
  }, [searchParams, teile, loading]);

  function openCreate() {
    setSelectedTeil(null);
    setModalOpen(true);
  }

  function openEdit(teil: LagerTeil) {
    setSelectedTeil(teil);
    setModalOpen(true);
  }

  function handleSaved(teil: LagerTeil) {
    setTeile((current) => {
      const index = current.findIndex((item) => item.id === teil.id);
      if (index === -1) {
        return [...current, teil].sort((a, b) =>
          a.herstellernummer.localeCompare(b.herstellernummer, "de")
        );
      }
      return current.map((item) => (item.id === teil.id ? teil : item));
    });
    setSelectedTeil(teil);
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !canWrite) return;

    setImporting(true);
    setImportStatus(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/lager/import", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setImportStatus(result.error ?? "Import fehlgeschlagen.");
    } else {
      const parseHint =
        Array.isArray(result.parseErrors) && result.parseErrors.length
          ? ` (${result.parseErrors.length} Zeilen übersprungen)`
          : "";
      const errorHint =
        Array.isArray(result.importErrors) && result.importErrors.length
          ? ` Fehler: ${result.importErrors.slice(0, 3).join("; ")}`
          : "";
      setImportStatus(
        `Import fertig: ${result.imported} neu, ${result.updated} aktualisiert.${parseHint}${errorHint}`
      );
      await loadTeile();
    }

    setImporting(false);
  }

  async function handleDelete(teil: LagerTeil) {
    if (!canWrite) return;
    if (!window.confirm(`„${teil.herstellernummer}“ wirklich löschen?`)) return;

    const { error } = await deleteLagerTeil(teil.id);
    if (error) {
      window.alert(error.message);
      return;
    }

    setTeile((current) => current.filter((item) => item.id !== teil.id));
    if (selectedTeil?.id === teil.id) {
      setModalOpen(false);
      setSelectedTeil(null);
    }
  }

  async function handleBulkDelete(mode: "all" | "catalog-prefix") {
    if (!canWrite) return;

    const label =
      mode === "all"
        ? "ALLE Teile im Lager unwiderruflich löschen?"
        : "Alle Standard-Artikelnummern (SP, SA, SO, SL, SK, SN …) löschen?";

    if (!window.confirm(label)) return;
    if (!window.confirm("Wirklich fortfahren? Dies kann nicht rückgängig gemacht werden.")) return;

    const response = await fetch("/api/lager/teile/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ mode }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      window.alert(result.error ?? "Löschen fehlgeschlagen.");
      return;
    }

    await loadTeile();
    setImportStatus(`${result.deleted ?? 0} Teile gelöscht.`);
  }

  return (
    <AppPageShell
      activeHref="/lager"
      top={
        <header className="pageHeader compactPageHeader">
          <div>
            <h1 style={{ margin: 0 }}>Lager</h1>
            <p className="lagerErsatzteileHeading">Ersatzteile</p>
            <p className="subtitle" style={{ margin: "6px 0 0" }}>
              Herstellernummer, Ersatzteil-Bezeichnung und Bild — Excel importiert in die
              bestehende Liste (gleiche Herstellernummer wird aktualisiert).
            </p>
          </div>
          <div className="detailTopActions">
            {canWrite ? (
              <>
                <label className="pillButton outline lagerImportButton">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    onChange={handleImport}
                    disabled={importing}
                  />
                  {importing ? "Import…" : "Excel importieren"}
                </label>
                <button
                  type="button"
                  className="pillButton outline"
                  onClick={() => handleBulkDelete("catalog-prefix")}
                  disabled={!teile.length}
                  title="SP, SA, SO, SL, SK, SN …"
                >
                  Standard-Nummern löschen
                </button>
                <button
                  type="button"
                  className="pillButton outline"
                  onClick={() => handleBulkDelete("all")}
                  disabled={!teile.length}
                >
                  Alles löschen
                </button>
              </>
            ) : null}
            <Link
              href="/lager/meldungen"
              className={`pillButton outline${meldungenCount > 0 ? " lagerMeldungenBtnActive" : ""}`}
            >
              Meldungen{meldungenCount > 0 ? ` (${meldungenCount})` : ""}
            </Link>
            <Link href="/lager/reservierungen" className="pillButton outline">
              Reservierungen
            </Link>
            <Link
              href="/lager/inventur"
              className="pillButton outline"
              title="Lagerstand inventarisieren"
            >
              Inventur
            </Link>
            <button
              type="button"
              className="pillButton primary"
              onClick={openCreate}
              disabled={!canWrite}
              title={!canWrite ? "Keine Berechtigung: warehouse.write" : undefined}
            >
              + Teil hinzufügen
            </button>
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
            <ol style={{ margin: "12px 0 0", paddingLeft: 20, lineHeight: 1.6 }}>
              <li>
                Öffnen Sie das{" "}
                <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
                  Supabase Dashboard
                </a>
              </li>
              <li>SQL → New query</li>
              <li>
                Inhalt von <code>supabase/lager-setup.sql</code> und{" "}
                <code>supabase/lager-menge-grenzen.sql</code> einfügen → Run
              </li>
              <li>Diese Seite neu laden</li>
            </ol>
          </div>
        ) : (
          <>
            {importStatus ? (
              <p className="protocolNotice" role="status">
                {importStatus}
              </p>
            ) : null}

            {meldungenCount > 0 ? (
              <p className="protocolNotice lagerMeldungenBanner" role="status">
                <strong>{meldungenCount}</strong> Meldung
                {meldungenCount === 1 ? "" : "en"} (PKW-Bedarf / Min-Max) —{" "}
                <Link href="/lager/meldungen">Meldungen anzeigen</Link>
              </p>
            ) : null}

            <LagerFiltersBar
              filters={filters}
              onChange={setFilters}
              matchCount={filteredTeile.length}
              totalCount={teile.length}
            />

            <article className="card machineTableWrap lagerErsatzteileCard">
              <h2 className="lagerTableSectionTitle">Ersatzteile</h2>
              <div className="machineTableScroll">
                <table className="machineTable lagerTable">
                  <thead>
                    <tr>
                      <th>Bild</th>
                      <th>Herstellernummer</th>
                      <th>Ersatzteil</th>
                      <th>Produktgruppe</th>
                      <th>Lieferant</th>
                      <th>Lagerort</th>
                      <th>Lagerplatz</th>
                      <th>Lagerstand</th>
                      <th>Min.</th>
                      <th>Max.</th>
                      <th>Status</th>
                      <th>Listen netto</th>
                      <th>Listen brutto</th>
                      <th>Verkauf</th>
                      <th>Bestellstatus</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeile.length === 0 ? (
                      <tr>
                        <td colSpan={16}>Keine Teile gefunden.</td>
                      </tr>
                    ) : (
                      filteredTeile.map((teil) => {
                        const alert = getLagerBestandAlert(teil);
                        return (
                        <tr
                          key={teil.id}
                          className={
                            alert === "below_min"
                              ? "lagerMeldungRowBelow"
                              : alert === "above_max"
                                ? "lagerMeldungRowAbove"
                                : undefined
                          }
                        >
                          <td>
                            <LagerTeilBild
                              teil={teil}
                              canWrite={canWrite}
                              uploadEnabled={false}
                              onUpdated={handleSaved}
                            />
                          </td>
                          <td>
                            <strong>{formatLagerValue(teil.herstellernummer)}</strong>
                            <div className="scanHint" style={{ marginTop: 4 }}>
                              Art.-Nr.: {formatLagerValue(teil.artikelnummer)}
                            </div>
                          </td>
                          <td className="lagerBezeichnungCell">
                            {teil.bezeichnung?.trim() ?? ""}
                          </td>
                          <td>{formatLagerValue(teil.produktgruppe)}</td>
                          <td>{formatLagerValue(teil.lieferant)}</td>
                          <td>{formatLagerValue(teil.lagerort)}</td>
                          <td>{formatLagerValue(teil.lagerplatz)}</td>
                          <td>{formatLagerNumber(teil.lagerstand)}</td>
                          <td>
                            <LagerMengeMinCell teil={teil} />
                          </td>
                          <td>{formatLagerNumber(teil.menge_max)}</td>
                          <td>
                            <LagerBestandBadge teil={teil} linkToMeldungen />
                          </td>
                          <td>{formatLagerCurrency(teil.listenpreis_netto)}</td>
                          <td>{formatLagerCurrency(teil.listenpreis_brutto)}</td>
                          <td>{formatLagerCurrency(teil.verkaufspreis)}</td>
                          <td>{formatLagerValue(teil.bestellstatus)}</td>
                          <td>
                            <div className="lagerRowActions">
                              <button
                                type="button"
                                className="pillButton outline"
                                onClick={() => openEdit(teil)}
                              >
                                Bearbeiten
                              </button>
                              {canWrite ? (
                                <button
                                  type="button"
                                  className="pillButton outline"
                                  onClick={() => handleDelete(teil)}
                                >
                                  Löschen
                                </button>
                              ) : null}
                            </div>
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

      <LagerTeilModal
        open={modalOpen}
        teil={selectedTeil}
        canWrite={canWrite}
        onClose={() => {
          setModalOpen(false);
          setSelectedTeil(null);
        }}
        onSaved={(teil) => {
          handleSaved(teil);
          if (!selectedTeil) {
            setSelectedTeil(teil);
          }
        }}
      />
    </AppPageShell>
  );
}

export default function LagerPage() {
  return (
    <Suspense
      fallback={
        <AppPageShell activeHref="/lager" subtitle="Lager">
          <div className="welcomeCard">
            <h2>Laden…</h2>
          </div>
        </AppPageShell>
      }
    >
      <LagerPageContent />
    </Suspense>
  );
}
