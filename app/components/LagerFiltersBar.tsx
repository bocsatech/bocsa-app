"use client";

import { EMPTY_LAGER_FILTERS, type LagerListFilters } from "../../lib/lager";

type Props = {
  filters: LagerListFilters;
  onChange: (filters: LagerListFilters) => void;
  matchCount?: number;
  totalCount?: number;
};

export default function LagerFiltersBar({ filters, onChange, matchCount, totalCount }: Props) {
  function update<K extends keyof LagerListFilters>(key: K, value: LagerListFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <section className="card lagerListSection lagerFiltersBar">
      <form className="lagerFilters" onSubmit={(event) => event.preventDefault()}>
        <label className="lagerFilterField">
          <span>Artikelnummer</span>
          <input
            type="search"
            value={filters.artikelnummer}
            onChange={(event) => update("artikelnummer", event.target.value)}
            placeholder="Artikelnummer"
            autoComplete="off"
          />
        </label>
        <label className="lagerFilterField">
          <span>Herstellernummer</span>
          <input
            type="search"
            value={filters.herstellernummer}
            onChange={(event) => update("herstellernummer", event.target.value)}
            placeholder="z. B. SA 16056"
            autoComplete="off"
          />
        </label>
        <label className="lagerFilterField">
          <span>Ersatzteil</span>
          <input
            type="search"
            value={filters.bezeichnung}
            onChange={(event) => update("bezeichnung", event.target.value)}
            placeholder="Bezeichnung"
            autoComplete="off"
          />
        </label>
        <label className="lagerFilterField">
          <span>Lagerort</span>
          <input
            type="search"
            value={filters.lagerort}
            onChange={(event) => update("lagerort", event.target.value)}
            placeholder="Lagerort"
            autoComplete="off"
          />
        </label>
        <label className="lagerFilterField">
          <span>Lagerstand</span>
          <input
            type="search"
            inputMode="decimal"
            value={filters.lagerstand}
            onChange={(event) => update("lagerstand", event.target.value)}
            placeholder="z. B. 5"
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          className="pillButton outline lagerFilterReset"
          onClick={() => onChange(EMPTY_LAGER_FILTERS)}
        >
          Zurücksetzen
        </button>
      </form>
      {typeof matchCount === "number" && typeof totalCount === "number" && totalCount > 0 ? (
        <p className="lagerListCount">
          {matchCount} von {totalCount} Teilen
        </p>
      ) : null}
    </section>
  );
}
