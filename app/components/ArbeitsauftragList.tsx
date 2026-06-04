"use client";

import "../arbeitsauftrag-list.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppPageShell from "./AppPageShell";
import MachineStatusIndicators from "./MachineStatusIndicators";
import { fetchMachines, formatValue, hasValue } from "../../lib/machines";
import type { MachineRecord } from "../../lib/machines";
import {
  collectAllWorkOrders,
  EMPTY_WORK_ORDER_FILTERS,
  filterWorkOrderEntries,
  formatOrderType,
  formatWorkOrderAuftragNr,
  truncateRepairDescription,
  workOrderUserLabel,
  type WorkOrderListEntry,
  type WorkOrderListFilters,
} from "../../lib/work-orders";
import type { Machine } from "../../lib/types/machine";
import { buildArbeitsauftragDetailHref } from "../../lib/arbeitsauftrag-routes";

const FROM_LIST_STORAGE_KEY = "arbeitsauftragFromList";

function RowField({
  label,
  value,
  className = "machineResultTitle",
  emphasize = false,
  strongValue = false,
}: {
  label: string;
  value: string;
  className?: string;
  emphasize?: boolean;
  strongValue?: boolean;
}) {
  if (!hasValue(value) || value === "—") return null;

  return (
    <span className={className}>
      <strong>{label}</strong>
      {emphasize ? (
        <b className="arbeitsauftragProtocolAuftrag">{value}</b>
      ) : strongValue ? (
        <b>{value}</b>
      ) : (
        <span>{value}</span>
      )}
    </span>
  );
}

type Props = {
  initialFilters?: Partial<WorkOrderListFilters>;
  /** Von Maschinendetail („Alle anzeigen“) — Zurück zur Gepseite */
  returnMachineId?: string;
};

export default function ArbeitsauftragList({ initialFilters, returnMachineId }: Props) {
  const router = useRouter();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [entries, setEntries] = useState<WorkOrderListEntry[]>([]);
  const [filters, setFilters] = useState<WorkOrderListFilters>({
    ...EMPTY_WORK_ORDER_FILTERS,
    ...initialFilters,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [cleaningUp, setCleaningUp] = useState(false);

  const machinesById = useMemo(() => {
    const map = new Map<string, Machine>();
    for (const machine of machines) map.set(machine.id, machine);
    return map;
  }, [machines]);

  const filteredEntries = useMemo(
    () => filterWorkOrderEntries(entries, filters),
    [entries, filters]
  );

  useEffect(() => {
    if (!initialFilters) return;
    setFilters((current) => ({ ...current, ...initialFilters }));
  }, [initialFilters]);

  useEffect(() => {
    async function loadSession() {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      const groups: string[] = Array.isArray(data.groups) ? data.groups : [];
      const username =
        typeof data.user?.username === "string" ? data.user.username.trim().toLowerCase() : "";
      setIsAdmin(groups.includes("Admin") || username === "admin");
    }

    loadSession();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await fetchMachines();
      if (fetchError) {
        setError(fetchError.message);
        setMachines([]);
        setEntries([]);
      } else {
        const rows = (data as Machine[]) ?? [];
        setMachines(rows);
        setEntries(collectAllWorkOrders(rows));
      }
      setLoading(false);
    }

    load();
  }, []);

  function updateFilter<K extends keyof WorkOrderListFilters>(key: K, value: WorkOrderListFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  async function handleCleanupLegacy() {
    const confirmed = window.confirm(
      "Alle Arbeitsaufträge von Maschinen mit alter Gerätenummer (nicht MARKE-KLASSE-ART-00001) löschen?"
    );
    if (!confirmed) return;

    setCleaningUp(true);
    setCleanupMessage(null);
    const response = await fetch("/api/arbeitsauftrag/cleanup-legacy", {
      method: "POST",
      credentials: "include",
    });
    const result = await response.json().catch(() => ({}));
    setCleaningUp(false);

    if (!response.ok) {
      setCleanupMessage(result.error ?? "Bereinigung fehlgeschlagen.");
      return;
    }

    setCleanupMessage(
      `${result.ordersRemoved ?? 0} Auftrag/Aufträge von ${result.machinesCleared ?? 0} Maschine(n) entfernt.`
    );

    const { data, error: fetchError } = await fetchMachines();
    if (!fetchError && data) {
      setMachines(data as Machine[]);
      setEntries(collectAllWorkOrders(data as Machine[]));
    }
  }

  return (
    <AppPageShell
      activeHref="/arbeitsauftrag"
      contentClassName="arbeitsauftragListPage"
      top={
        <div className="detailTopBar">
          <h1>Arbeitsauftrag</h1>
          <div className="detailTopActions">
            <Link
              className="pillButton outline"
              href={
                returnMachineId
                  ? `/maschinen/${encodeURIComponent(returnMachineId)}`
                  : "/maschinen"
              }
            >
              {returnMachineId ? "Zur Maschinen" : "Zur Maschinenliste"}
            </Link>
            {isAdmin ? (
              <button
                type="button"
                className="pillButton outline"
                onClick={handleCleanupLegacy}
                disabled={cleaningUp}
              >
                {cleaningUp ? "Bereinigen…" : "Legacy-Aufträge löschen"}
              </button>
            ) : null}
          </div>
        </div>
      }
    >
          {cleanupMessage ? (
            <p className="protocolNotice success">{cleanupMessage}</p>
          ) : null}
          <section className="protocolSection card machineResultCard arbeitsauftragListSection">
            <form
              className="arbeitsauftragFilters"
              onSubmit={(event) => event.preventDefault()}
            >
              <label className="arbeitsauftragFilterField">
                <span>Gerätenummer</span>
                <input
                  type="search"
                  value={filters.geraetenummer}
                  onChange={(event) => updateFilter("geraetenummer", event.target.value)}
                  placeholder="z. B. GE_017909"
                />
              </label>
              <label className="arbeitsauftragFilterField">
                <span>Bearbeiter</span>
                <input
                  type="search"
                  value={filters.bearbeiter}
                  onChange={(event) => updateFilter("bearbeiter", event.target.value)}
                  placeholder="Benutzername"
                />
              </label>
              <label className="arbeitsauftragFilterField">
                <span>Datum von</span>
                <input
                  type="text"
                  value={filters.dateFrom}
                  onChange={(event) => updateFilter("dateFrom", event.target.value)}
                  placeholder="TT.MM.JJJJ"
                />
              </label>
              <label className="arbeitsauftragFilterField">
                <span>Datum bis</span>
                <input
                  type="text"
                  value={filters.dateTo}
                  onChange={(event) => updateFilter("dateTo", event.target.value)}
                  placeholder="TT.MM.JJJJ"
                />
              </label>
              <label className="arbeitsauftragFilterField">
                <span>Filiale</span>
                <input
                  type="search"
                  value={filters.filiale}
                  onChange={(event) => updateFilter("filiale", event.target.value)}
                  placeholder="Depot / Filiale"
                />
              </label>
              <button
                type="button"
                className="pillButton outline arbeitsauftragFilterReset"
                onClick={() => setFilters(EMPTY_WORK_ORDER_FILTERS)}
              >
                Zurücksetzen
              </button>
            </form>

            {loading ? <p className="scanHint">Protokolle werden geladen...</p> : null}
            {error ? <p className="protocolNotice">{error}</p> : null}

            {!loading && !error && entries.length === 0 ? (
              <p className="scanHint">Noch keine Arbeitsaufträge gespeichert.</p>
            ) : null}

            {!loading && !error && entries.length > 0 && filteredEntries.length === 0 ? (
              <p className="scanHint">Keine Treffer für die gewählten Filter.</p>
            ) : null}

            {!loading && !error && filteredEntries.length > 0 ? (
              <>
                <p className="arbeitsauftragListCount">
                  {filteredEntries.length} von {entries.length} Protokollen
                </p>
                <div className="arbeitsauftragResultList">
                  {filteredEntries.map((entry) => {
                    const machine = machinesById.get(entry.machineId) as MachineRecord | undefined;
                    const bezeichnung = entry.bezeichnung || machine?.bezeichnung;
                    const serial = machine?.serial_number;
                    const image = machine?.image;

                    const detailHref = buildArbeitsauftragDetailHref({
                      machineId: entry.machineId,
                      auftragId: entry.id,
                      from: "list",
                    });

                    function openDetail() {
                      sessionStorage.setItem(FROM_LIST_STORAGE_KEY, "1");
                      router.push(detailHref);
                    }

                    return (
                      <div
                        key={`${entry.machineId}-${entry.id}`}
                        className="machineResultRow"
                        role="link"
                        tabIndex={0}
                        onClick={openDetail}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openDetail();
                          }
                        }}
                      >
                        {machine ? (
                          <MachineStatusIndicators
                            machine={machine}
                            className="machineResultStatus"
                          />
                        ) : (
                          <span className="machineResultStatus" aria-hidden="true" />
                        )}

                        <span className="machineThumb" aria-label="Bild">
                          {image ? <img src={image} alt="" /> : <span>Bild</span>}
                        </span>

                        <span className="machineResultMain">
                          <RowField
                            label="Gerätenummer"
                            value={formatValue(entry.geraetenummer)}
                            strongValue
                          />
                          <RowField
                            label="Bezeichnung"
                            value={formatValue(bezeichnung)}
                            strongValue
                          />
                          <RowField
                            label="Seriennummer"
                            value={formatValue(serial)}
                            className="machineResultDetail"
                          />
                        </span>

                        <span className="machineResultMeta">
                          <RowField
                            label="Auftragsart"
                            value={formatOrderType(entry.type)}
                            emphasize
                          />
                          <RowField
                            label="Bearbeiter"
                            value={workOrderUserLabel(entry) || "—"}
                          />
                          <RowField
                            label="Reparaturbeschreibung"
                            value={truncateRepairDescription(entry.repairDescription, 80)}
                            className="machineResultDetail"
                          />
                        </span>

                        <span className="machineResultMeta">
                          <RowField
                            label="Auftrag-Nr."
                            value={formatWorkOrderAuftragNr(entry)}
                            strongValue
                          />
                          <RowField label="Datum" value={entry.date || "—"} />
                          <RowField label="Depot" value={entry.filiale || "—"} strongValue />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </section>
    </AppPageShell>
  );
}
