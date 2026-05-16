"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchLagerTeile, filterLagerTeile, formatLagerNumber, formatLagerValue } from "../../lib/lager";
import type { LagerTeil } from "../../lib/types/lager";

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  onSelect: (teil: LagerTeil) => void;
  excludeIds?: string[];
  /** Hinweis: beim Arbeitsauftrag wird Lagerstand beim Hinzufügen ausgebucht */
  issueOnSelect?: boolean;
  initialQuery?: string;
};

export default function LagerTeilPickerModal({
  open,
  title = "Teil aus Lager wählen",
  onClose,
  onSelect,
  excludeIds = [],
  issueOnSelect = false,
  initialQuery = "",
}: Props) {
  const [teile, setTeile] = useState<LagerTeil[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setError(null);
    setLoading(true);

    fetchLagerTeile().then(({ data, error: loadError }) => {
      if (loadError) {
        setError(loadError.message);
        setTeile([]);
      } else {
        setTeile(data ?? []);
      }
      setLoading(false);
    });
  }, [open, initialQuery]);

  const filtered = useMemo(() => {
    const excluded = new Set(excludeIds);
    return filterLagerTeile(
      teile.filter((teil) => !excluded.has(teil.id)),
      query
    );
  }, [teile, query, excludeIds]);

  if (!open) return null;

  return (
    <div className="qrModalBackdrop">
      <div className="card lagerModal lagerPickerModal">
        <div className="cardHeader">
          <div>
            <p className="cardTitle">{title}</p>
            <p className="subtitle">
              {issueOnSelect
                ? "Hinzufügen bucht 1 Stück sofort aus dem Lager aus"
                : "Teil auswählen und ins Protokoll übernehmen"}
            </p>
          </div>
          <button type="button" className="pillButton outline" onClick={onClose}>
            Schließen
          </button>
        </div>

        <label className="searchField">
          <span>Suche</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Herstellernummer, Ersatzteil, Lagerplatz…"
            autoFocus
          />
        </label>

        {loading ? <p className="scanHint">Laden…</p> : null}
        {error ? <p className="protocolNotice">{error}</p> : null}

        <div className="machineTableScroll lagerPickerList">
          <table className="machineTable lagerTable">
            <thead>
              <tr>
                <th>Herstellernummer</th>
                <th>Ersatzteil</th>
                <th>Lagerplatz</th>
                <th>Lagerstand</th>
                <th className="lagerPickerActionHead">Hinzufügen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>Keine Teile gefunden.</td>
                </tr>
              ) : (
                filtered.map((teil) => (
                  <tr key={teil.id}>
                    <td>
                      <strong>{formatLagerValue(teil.herstellernummer)}</strong>
                    </td>
                    <td>{teil.bezeichnung?.trim() || "—"}</td>
                    <td>{formatLagerValue(teil.lagerplatz)}</td>
                    <td>{formatLagerNumber(teil.lagerstand)}</td>
                    <td className="lagerPickerActionCell">
                      <button
                        type="button"
                        className="pillButton primary lagerPickerHinzufBtn"
                        onClick={() => {
                          onSelect(teil);
                          onClose();
                        }}
                      >
                        Hinzufügen
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
