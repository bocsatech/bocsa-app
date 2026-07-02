"use client";

import { useMemo, useState } from "react";
import { matchesRechnungSearch } from "../../lib/rechnung-search";

type Props<T> = {
  label: string;
  value: string;
  options: T[];
  getOptionValue: (item: T) => string;
  getOptionLabel: (item: T) => string;
  getSearchText: (item: T) => string;
  onChange: (value: string, item: T | null) => void;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyOptionLabel?: string;
};

export default function RechnungSearchSelect<T>({
  label,
  value,
  options,
  getOptionValue,
  getOptionLabel,
  getSearchText,
  onChange,
  searchPlaceholder = "Suchen…",
  disabled = false,
  emptyOptionLabel = "—",
}: Props<T>) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => options.filter((item) => matchesRechnungSearch(getSearchText(item), search)),
    [options, search, getSearchText]
  );

  const searchActive = search.trim().length > 0;

  return (
    <label className="rechnungSearchSelect">
      {label}
      <input
        type="search"
        className="rechnungSearchSelectInput"
        placeholder={searchPlaceholder}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        disabled={disabled}
      />
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const nextValue = event.target.value;
          const item = options.find((entry) => getOptionValue(entry) === nextValue) ?? null;
          onChange(nextValue, item);
        }}
      >
        <option value="">{emptyOptionLabel}</option>
        {filtered.map((item) => (
          <option key={getOptionValue(item)} value={getOptionValue(item)}>
            {getOptionLabel(item)}
          </option>
        ))}
      </select>
      {searchActive && filtered.length === 0 ? (
        <span className="rechnungSearchSelectHint">Keine Treffer</span>
      ) : null}
    </label>
  );
}
