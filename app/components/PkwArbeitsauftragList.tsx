"use client";

import "../arbeitsauftrag-list.css";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppPageShell from "./AppPageShell";
import PkwStatusIndicators from "./PkwStatusIndicators";
import { formatKundeName, fetchPkwFahrzeuge } from "../../lib/pkw";
import { hasValue } from "../../lib/machines";
import {
  collectAllPkwWorkOrders,
  EMPTY_PKW_WORK_ORDER_FILTERS,
  filterPkwWorkOrderEntries,
  formatOrderType,
  formatWorkOrderAuftragNr,
  truncateRepairDescription,
  workOrderUserLabel,
  type PkwWorkOrderListEntry,
  type PkwWorkOrderListFilters,
} from "../../lib/pkw-work-orders";
import { buildPkwArbeitsauftragDetailHref } from "../../lib/pkw-arbeitsauftrag-routes";
import type { PkwFahrzeug } from "../../lib/types/pkw";

const FROM_LIST_STORAGE_KEY = "pkwArbeitsauftragFromList";

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
  initialFilters?: Partial<PkwWorkOrderListFilters>;
  returnFahrzeugId?: string;
};

export default function PkwArbeitsauftragList({ initialFilters, returnFahrzeugId }: Props) {
  const router = useRouter();
  const [fahrzeuge, setFahrzeuge] = useState<PkwFahrzeug[]>([]);
  const [entries, setEntries] = useState<PkwWorkOrderListEntry[]>([]);
  const [filters, setFilters] = useState<PkwWorkOrderListFilters>({
    ...EMPTY_PKW_WORK_ORDER_FILTERS,
    ...initialFilters,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fahrzeugeById = useMemo(() => {
    const map = new Map<string, PkwFahrzeug>();
    for (const fahrzeug of fahrzeuge) map.set(fahrzeug.id, fahrzeug);
    return map;
  }, [fahrzeuge]);

  const filteredEntries = useMemo(
    () => filterPkwWorkOrderEntries(entries, filters),
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
      const { data, error: fetchError } = await fetchPkwFahrzeuge();
      if (fetchError) {
        setError(fetchError);
        setFahrzeuge([]);
        setEntries([]);
      } else {
        const rows = data ?? [];
        setFahrzeuge(rows);
        setEntries(collectAllPkwWorkOrders(rows));
      }
      setLoading(false);
    }

    load();
  }, []);

  function updateFilter<K extends keyof PkwWorkOrderListFilters>(
    key: K,
    value: PkwWorkOrderListFilters[K]
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <AppPageShell
      activeHref="/pkw/arbeitsauftrag"
      contentClassName="arbeitsauftragListPage"
      top={
        <div className="detailTopBar">
          <h1>Arbeitsauftrag</h1>
          <div className="detailTopActions">
            <button
              type="button"
              className="pillButton outline"
              onClick={() =>
                router.push(
                  returnFahrzeugId
                    ? `/pkw/fahrzeuge/${encodeURIComponent(returnFahrzeugId)}`
                    : "/pkw/fahrzeuge"
                )
              }
            >
              {returnFahrzeugId ? "Zurück zum Fahrzeug" : "Zur Fahrzeugliste"}
            </button>
          </div>
        </div>
      }
    >
      <section className="protocolSection card machineResultCard arbeitsauftragListSection">
        <form className="arbeitsauftragFilters" onSubmit={(event) => event.preventDefault()}>
          <label className="arbeitsauftragFilterField">
            <span>Kennzeichen</span>
            <input
              type="search"
              value={filters.kennzeichen}
              onChange={(event) => updateFilter("kennzeichen", event.target.value)}
              placeholder="z. B. W 1234 AB"
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
            <span>Kunde</span>
            <input
              type="search"
              value={filters.kunde}
              onChange={(event) => updateFilter("kunde", event.target.value)}
              placeholder="Name oder Firma"
            />
          </label>
          <button
            type="button"
            className="pillButton outline arbeitsauftragFilterReset"
            onClick={() => setFilters(EMPTY_PKW_WORK_ORDER_FILTERS)}
          >
            Zurücksetzen
          </button>
        </form>

        {loading ? <p className="scanHint">Protokolle werden geladen…</p> : null}
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
                const fahrzeug = fahrzeugeById.get(entry.fahrzeugId);
                const detailHref = buildPkwArbeitsauftragDetailHref({
                  fahrzeugId: entry.fahrzeugId,
                  auftragId: entry.id,
                  from: "list",
                });

                function openDetail() {
                  sessionStorage.setItem(FROM_LIST_STORAGE_KEY, "1");
                  router.push(detailHref);
                }

                return (
                  <div
                    key={`${entry.fahrzeugId}-${entry.id}`}
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
                    {fahrzeug ? (
                      <PkwStatusIndicators fahrzeug={fahrzeug} className="machineResultStatus" />
                    ) : (
                      <span className="machineResultStatus" aria-hidden="true" />
                    )}

                    <span className="machineThumb" aria-label="Bild">
                      {fahrzeug?.bild ? <img src={fahrzeug.bild} alt="" /> : <span>Bild</span>}
                    </span>

                    <span className="machineResultMain">
                      <RowField label="Kennzeichen" value={entry.kennzeichen} strongValue />
                      <RowField label="Marke / Modell" value={entry.bezeichnung || "—"} strongValue />
                      <RowField label="FIN" value={fahrzeug?.fin ?? ""} className="machineResultDetail" />
                    </span>

                    <span className="machineResultMeta">
                      <RowField label="Auftragsart" value={formatOrderType(entry.type)} emphasize />
                      <RowField label="Bearbeiter" value={workOrderUserLabel(entry) || "—"} />
                      <RowField
                        label="Reparaturbeschreibung"
                        value={truncateRepairDescription(entry.repairDescription, 80)}
                        className="machineResultDetail"
                      />
                    </span>

                    <span className="machineResultMeta">
                      <RowField label="Auftrag-Nr." value={formatWorkOrderAuftragNr(entry)} strongValue />
                      <RowField label="Datum" value={entry.date || "—"} />
                      <RowField
                        label="Kunde"
                        value={entry.kunde || (fahrzeug?.kunde ? formatKundeName(fahrzeug.kunde) : "—")}
                        strongValue
                      />
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
