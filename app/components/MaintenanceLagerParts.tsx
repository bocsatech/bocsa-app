"use client";

import { useEffect, useState } from "react";
import { fetchLagerTeile, formatLagerNumber, formatLagerValue } from "../../lib/lager";
import type { MaintenanceLagerLink } from "../../lib/types/maintenance";
import LagerTeilPickerModal from "./LagerTeilPickerModal";

type Props = {
  parts: MaintenanceLagerLink[];
  canEdit: boolean;
  onChange: (parts: MaintenanceLagerLink[]) => void;
};

export default function MaintenanceLagerParts({ parts, canEdit, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stockById, setStockById] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadStock() {
      const { data } = await fetchLagerTeile();
      if (!data) return;
      const map: Record<string, number> = {};
      for (const teil of data) {
        map[teil.id] = Number(teil.lagerstand ?? 0);
      }
      setStockById(map);
    }

    loadStock();
  }, [parts]);

  function addPart(teil: {
    id: string;
    herstellernummer: string;
    bezeichnung?: string | null;
    lagerplatz?: string | null;
    lagerstand?: number;
  }) {
    if (parts.some((part) => part.lagerTeilId === teil.id)) return;

    onChange([
      ...parts,
      {
        lagerTeilId: teil.id,
        herstellernummer: teil.herstellernummer,
        bezeichnung: teil.bezeichnung ?? null,
        lagerplatz: teil.lagerplatz ?? null,
      },
    ]);
    setStockById((current) => ({
      ...current,
      [teil.id]: Number(teil.lagerstand ?? 0),
    }));
  }

  function removePart(lagerTeilId: string) {
    onChange(parts.filter((part) => part.lagerTeilId !== lagerTeilId));
  }

  return (
    <div className="maintenanceLagerBlock">
      <div className="maintenanceLagerHeader">
        <h3>Ersatzteile aus Lager</h3>
        {canEdit ? (
          <button type="button" className="pillButton outline" onClick={() => setPickerOpen(true)}>
            + Teil aus Lager
          </button>
        ) : null}
      </div>
      <p className="lagerBildHint">
        Nur Referenz für diese Maschine — Lagerstand wird hier nicht geändert.
      </p>

      <div className="machineTableScroll">
        <table className="machineTable lagerTable maintenanceLagerTable">
          <thead>
            <tr>
              <th>Herstellernummer</th>
              <th>Ersatzteil</th>
              <th>Lagerplatz</th>
              <th>Lagerstand</th>
              {canEdit ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {parts.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 5 : 4}>Noch keine Teile verknüpft.</td>
              </tr>
            ) : (
              parts.map((part) => (
                <tr key={part.lagerTeilId}>
                  <td>
                    <strong>{formatLagerValue(part.herstellernummer)}</strong>
                  </td>
                  <td>{part.bezeichnung?.trim() || "—"}</td>
                  <td>{formatLagerValue(part.lagerplatz)}</td>
                  <td>{formatLagerNumber(stockById[part.lagerTeilId])}</td>
                  {canEdit ? (
                    <td>
                      <button
                        type="button"
                        className="pillButton outline"
                        onClick={() => removePart(part.lagerTeilId)}
                      >
                        Entfernen
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <LagerTeilPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addPart}
        excludeIds={parts.map((part) => part.lagerTeilId)}
      />
    </div>
  );
}
