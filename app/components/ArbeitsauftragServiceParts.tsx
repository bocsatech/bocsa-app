"use client";

import { useState } from "react";
import {
  createEmptyServicePart,
  type WorkOrderServicePart,
} from "../../lib/work-orders";
import LagerTeilPickerModal from "./LagerTeilPickerModal";

type Props = {
  parts: WorkOrderServicePart[];
  canEdit: boolean;
  onChange: (parts: WorkOrderServicePart[]) => void;
};

export default function ArbeitsauftragServiceParts({
  parts,
  canEdit,
  onChange,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function updatePart(id: string, patch: Partial<WorkOrderServicePart>) {
    onChange(
      parts.map((part) => (part.id === id ? { ...part, ...patch } : part))
    );
  }

  function addEmptyPart() {
    onChange([...parts, createEmptyServicePart()]);
  }

  function addFromLager(teil: {
    id: string;
    herstellernummer: string;
    bezeichnung?: string | null;
  }) {
    if (parts.some((part) => part.lagerTeilId === teil.id)) return;

    onChange([
      ...parts,
      createEmptyServicePart({
        serviceMaterial: teil.bezeichnung?.trim() || teil.herstellernummer,
        juraHifi: teil.herstellernummer,
        sfFilter: "",
        lagerTeilId: teil.id,
      }),
    ]);
  }

  function removePart(id: string) {
    onChange(parts.filter((part) => part.id !== id));
  }

  return (
    <div className="servicePartsBlock">
      <div className="servicePartsHeader">
        <h3>Service-Material / Ersatzteile</h3>
        {canEdit ? (
          <div className="detailTopActions">
            <button type="button" className="pillButton outline" onClick={addEmptyPart}>
              + Teil hinzufügen
            </button>
            <button
              type="button"
              className="pillButton outline"
              onClick={() => setPickerOpen(true)}
            >
              + Teil aus Lager
            </button>
          </div>
        ) : null}
      </div>
      <p className="lagerBildHint">
        Service-Material mit Herstellernummern — frei bearbeitbar beim Speichern.
      </p>

      <div className="machineTableScroll">
        <table className="machineTable servicePartsTable">
          <thead>
            <tr>
              <th>Service Material</th>
              <th className="servicePartsColJura">Jura HiFi</th>
              <th className="servicePartsColSf">SF-Filter</th>
              {canEdit ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {parts.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 4 : 3}>Noch keine Teile eingetragen.</td>
              </tr>
            ) : (
              parts.map((part) => (
                <tr key={part.id}>
                  <td>
                    {canEdit ? (
                      <input
                        type="text"
                        className="servicePartsInput"
                        value={part.serviceMaterial}
                        placeholder="z. B. Motorölfilter"
                        onChange={(e) =>
                          updatePart(part.id, { serviceMaterial: e.target.value })
                        }
                      />
                    ) : (
                      part.serviceMaterial.trim() || "—"
                    )}
                  </td>
                  <td className="servicePartsColJura">
                    {canEdit ? (
                      <input
                        type="text"
                        className="servicePartsInput servicePartsInputJura"
                        value={part.juraHifi}
                        placeholder="z. B. SO 242"
                        onChange={(e) =>
                          updatePart(part.id, { juraHifi: e.target.value })
                        }
                      />
                    ) : (
                      <span className="servicePartsValueJura">
                        {part.juraHifi.trim() || "—"}
                      </span>
                    )}
                  </td>
                  <td className="servicePartsColSf">
                    {canEdit ? (
                      <input
                        type="text"
                        className="servicePartsInput servicePartsInputSf"
                        value={part.sfFilter}
                        placeholder="z. B. SP 4384"
                        onChange={(e) =>
                          updatePart(part.id, { sfFilter: e.target.value })
                        }
                      />
                    ) : (
                      <span className="servicePartsValueSf">
                        {part.sfFilter.trim() || "—"}
                      </span>
                    )}
                  </td>
                  {canEdit ? (
                    <td>
                      <button
                        type="button"
                        className="pillButton outline"
                        onClick={() => removePart(part.id)}
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
        onSelect={addFromLager}
        excludeIds={parts
          .map((part) => part.lagerTeilId)
          .filter((id): id is string => Boolean(id))}
      />
    </div>
  );
}
