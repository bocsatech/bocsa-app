"use client";

import {
  emptyPkwReifenSatz,
  REIFEN_SATZ_FIELDS,
} from "../../lib/pkw-reifen";
import type { PkwReifenSatz } from "../../lib/types/pkw";

type Props = {
  saetze: PkwReifenSatz[];
  onChange: (saetze: PkwReifenSatz[]) => void;
  readOnly?: boolean;
};

export default function PkwReifenEditor({ saetze, onChange, readOnly = false }: Props) {
  function updateSatz(index: number, key: keyof PkwReifenSatz, value: string) {
    onChange(saetze.map((satz, i) => (i === index ? { ...satz, [key]: value } : satz)));
  }

  function addSatz() {
    onChange([...saetze, emptyPkwReifenSatz()]);
  }

  function removeSatz(index: number) {
    onChange(saetze.filter((_, i) => i !== index));
  }

  return (
    <div className="pkwReifenEditorPanel">
      {saetze.length === 0 ? (
        <p className="subtitle pkwReifenEmpty">Noch keine Reifensätze hinterlegt.</p>
      ) : (
        saetze.map((satz, index) => (
          <div key={index} className="pkwReifenSatzCard">
            <div className="pkwReifenSatzHead">
              <strong>Reifen {index + 1}</strong>
              {!readOnly ? (
                <button
                  type="button"
                  className="linkBtn linkBtnDanger"
                  onClick={() => removeSatz(index)}
                >
                  Entfernen
                </button>
              ) : null}
            </div>
            <div className="fieldGrid">
              {REIFEN_SATZ_FIELDS.map(({ key, label, placeholder }) => (
                <label key={key} className="fieldRow">
                  <span>{label}</span>
                  <input
                    value={satz[key] ?? ""}
                    onChange={(e) => updateSatz(index, key, e.target.value)}
                    placeholder={placeholder}
                    readOnly={readOnly}
                    disabled={readOnly}
                  />
                </label>
              ))}
            </div>
          </div>
        ))
      )}

      {!readOnly ? (
        <button type="button" className="pillButton outline pkwReifenAddBtn" onClick={addSatz}>
          + Reifen hinzufügen
        </button>
      ) : null}
    </div>
  );
}
