"use client";

import Link from "next/link";
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
  truncateRepairDescription,
  workOrderUserLabel,
  type WorkOrderListEntry,
  type WorkOrderListFilters,
} from "../../lib/work-orders";
import type { Machine } from "../../lib/types/machine";

const FROM_LIST_STORAGE_KEY = "arbeitsauftragFromList";

function ProtocolField({
  label,
  value,
  emphasize = false,
  multiline = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  multiline?: boolean;
}) {
  if (!hasValue(value) || value === "—") {
    return (
      <span className="arbeitsauftragProtocolField">
        <strong>{label}</strong>
        <span>—</span>
      </span>
    );
  }

  return (
    <span className="arbeitsauftragProtocolField">
      <strong>{label}</strong>
      {emphasize ? (
        <b className="arbeitsauftragProtocolAuftrag">{value}</b>
      ) : (
        <span className={multiline ? "arbeitsauftragProtocolDesc" : undefined}>{value}</span>
      )}
    </span>
  );
}

type Props = {
  initialFilters?: Partial<WorkOrderListFilters>;
};

export default function ArbeitsauftragList({ initialFilters }: Props) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [entries, setEntries] = useState<WorkOrderListEntry[]>([]);
  const [filters, setFilters] = useState<WorkOrderListFilters>({
    ...EMPTY_WORK_ORDER_FILTERS,
    ...initialFilters,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <AppPageShell
      activeHref="/arbeitsauftrag"
      contentClassName="arbeitsauftragListPage"
      top={
        <div className="detailTopBar">
          <h1>Arbeitsauftrag</h1>
          <div className="detailTopActions">
            <Link className="pillButton outline" href="/maschinen">
              Zur Maschinenliste
            </Link>
          </div>
        </div>
      }
    >
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

                    return (
                      <Link
                        key={`${entry.machineId}-${entry.id}`}
                        className="arbeitsauftragResultCard"
                        href={`/arbeitsauftrag?machineId=${entry.machineId}&auftragId=${encodeURIComponent(entry.id)}&from=list`}
                        onClick={() => {
                          sessionStorage.setItem(FROM_LIST_STORAGE_KEY, "1");
                        }}
                      >
                        <div className="arbeitsauftragResultTop">
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
                            <span className="machineResultTitle">
                              <strong>Gerätenummer</strong>
                              <b>{formatValue(entry.geraetenummer)}</b>
                            </span>
                            {hasValue(bezeichnung) ? (
                              <span className="machineResultTitle">
                                <strong>Bezeichnung</strong>
                                <b>{formatValue(bezeichnung)}</b>
                              </span>
                            ) : null}
                            {hasValue(serial) ? (
                              <span className="machineResultDetail">
                                <strong>Seriennummer</strong>
                                {formatValue(serial)}
                              </span>
                            ) : null}
                          </span>
                        </div>

                        <div className="arbeitsauftragProtocolMeta">
                          <ProtocolField
                            label="Auftragsart"
                            value={formatOrderType(entry.type)}
                            emphasize
                          />
                          <ProtocolField
                            label="Bearbeiter"
                            value={workOrderUserLabel(entry) || "—"}
                          />
                          <ProtocolField
                            label="Reparaturbeschreibung"
                            value={truncateRepairDescription(entry.repairDescription, 120)}
                            multiline
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : null}
          </section>
    </AppPageShell>
  );
}
