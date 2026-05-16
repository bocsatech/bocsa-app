"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppPageShell from "./AppPageShell";
import { fetchMachines } from "../../lib/machines";
import type { Machine } from "../../lib/types/machine";
import {
  EMPTY_PRUEFPROTOKOLL_FILTERS,
  GERAETTYP_OPTIONS,
  collectAllPruefprotokolle,
  filterPruefprotokollEntries,
  pruefprotokollUserLabel,
  type PruefprotokollListEntry,
  type PruefprotokollListFilters,
} from "../../lib/pruefprotokoll";

function normalizeGeraet(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function PruefprotokollList() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [entries, setEntries] = useState<PruefprotokollListEntry[]>([]);
  const [filters, setFilters] = useState<PruefprotokollListFilters>({
    ...EMPTY_PRUEFPROTOKOLL_FILTERS,
  });
  const [newGeraet, setNewGeraet] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setEntries(collectAllPruefprotokolle(rows));
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(
    () => filterPruefprotokollEntries(entries, filters),
    [entries, filters]
  );

  const newMachine = useMemo(() => {
    const query = normalizeGeraet(newGeraet);
    if (!query) return null;
    return (
      machines.find((machine) => {
        const nummer = normalizeGeraet(String(machine.geraetenummer ?? ""));
        return nummer === query || nummer.includes(query);
      }) ?? null
    );
  }, [machines, newGeraet]);

  function updateFilter<K extends keyof PruefprotokollListFilters>(
    key: K,
    value: PruefprotokollListFilters[K]
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <AppPageShell
      activeHref="/pruefprotokoll"
      contentClassName="arbeitsauftragListPage"
      top={
        <div className="detailTopBar">
          <h1>Prüfprotokoll</h1>
          <div className="detailTopActions">
            <Link className="pillButton outline" href="/maschinen">
              Zur Maschinenliste
            </Link>
          </div>
        </div>
      }
    >
      <section className="protocolSection card arbeitsauftragListSection">
        <form
          className="arbeitsauftragFilters ppListNewRow"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="arbeitsauftragFilterField">
            <span>Neues Protokoll (Gerätenummer)</span>
            <input
              type="search"
              value={newGeraet}
              placeholder="z. B. GE_017909"
              onChange={(e) => setNewGeraet(e.target.value)}
            />
          </label>
          {newMachine ? (
            <Link
              className="pillButton primary"
              href={`/pruefprotokoll/form?machineId=${encodeURIComponent(newMachine.id)}`}
            >
              Protokoll anlegen
            </Link>
          ) : (
            <button type="button" className="pillButton primary" disabled>
              Protokoll anlegen
            </button>
          )}
        </form>

        <form
          className="arbeitsauftragFilters"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="arbeitsauftragFilterField">
            <span>Gerätenummer</span>
            <input
              type="search"
              value={filters.geraetenummer}
              placeholder="z. B. GE_017909"
              onChange={(e) => updateFilter("geraetenummer", e.target.value)}
            />
          </label>
          <label className="arbeitsauftragFilterField">
            <span>Datum von</span>
            <input
              type="text"
              value={filters.dateFrom}
              placeholder="TT.MM.JJJJ"
              onChange={(e) => updateFilter("dateFrom", e.target.value)}
            />
          </label>
          <label className="arbeitsauftragFilterField">
            <span>Datum bis</span>
            <input
              type="text"
              value={filters.dateTo}
              placeholder="TT.MM.JJJJ"
              onChange={(e) => updateFilter("dateTo", e.target.value)}
            />
          </label>
          <label className="arbeitsauftragFilterField">
            <span>User</span>
            <input
              type="search"
              value={filters.user}
              placeholder="Benutzername"
              onChange={(e) => updateFilter("user", e.target.value)}
            />
          </label>
          <label className="arbeitsauftragFilterField">
            <span>Filiale</span>
            <input
              type="search"
              value={filters.filiale}
              placeholder="Depot"
              onChange={(e) => updateFilter("filiale", e.target.value)}
            />
          </label>
          <label className="arbeitsauftragFilterField">
            <span>Gerättyp</span>
            <select
              value={filters.geraettyp}
              onChange={(e) => updateFilter("geraettyp", e.target.value)}
            >
              <option value="">Alle</option>
              {GERAETTYP_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="pillButton outline arbeitsauftragFilterReset"
            onClick={() => setFilters({ ...EMPTY_PRUEFPROTOKOLL_FILTERS })}
          >
            Zurücksetzen
          </button>
        </form>

        {loading ? <p className="scanHint">Protokolle werden geladen…</p> : null}
        {error ? <p className="protocolNotice">{error}</p> : null}

        {!loading && !error && entries.length === 0 ? (
          <p className="scanHint">Noch keine Prüfprotokolle gespeichert.</p>
        ) : null}

        {!loading && !error && entries.length > 0 && filtered.length === 0 ? (
          <p className="scanHint">Keine Treffer für die gewählten Filter.</p>
        ) : null}

        {!loading && !error && filtered.length > 0 ? (
          <>
            <p className="arbeitsauftragListCount">
              {filtered.length} von {entries.length} Protokollen
            </p>
            <ul className="arbeitsauftragProtocolList">
              {filtered.map((entry) => (
                <li key={`${entry.machineId}-${entry.id}`}>
                  <Link
                    href={`/pruefprotokoll/form?machineId=${encodeURIComponent(entry.machineId)}&protokollId=${encodeURIComponent(entry.id)}`}
                    className="arbeitsauftragProtocolLink"
                  >
                    <span className="arbeitsauftragProtocolFields">
                      <span className="arbeitsauftragProtocolField">
                        <strong>Gerätenummer</strong>
                        <b>{entry.geraetenummer || "—"}</b>
                      </span>
                      <span className="arbeitsauftragProtocolField">
                        <strong>Prüfdatum</strong>
                        <span>{entry.pruefdatum || entry.geraetedaten.pruefdatum || "—"}</span>
                      </span>
                      <span className="arbeitsauftragProtocolField">
                        <strong>User</strong>
                        <span>{pruefprotokollUserLabel(entry)}</span>
                      </span>
                      <span className="arbeitsauftragProtocolField">
                        <strong>Filiale</strong>
                        <span>{entry.filiale || "—"}</span>
                      </span>
                      <span className="arbeitsauftragProtocolField">
                        <strong>Gerättyp</strong>
                        <span>{entry.geraettyp || "—"}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </AppPageShell>
  );
}
