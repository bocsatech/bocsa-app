"use client";

import type { ReactNode } from "react";
import GermanDateField from "./GermanDateField";
import PkwHeroMedia from "./PkwHeroMedia";
import {
  buildPkwStammdatenRows,
  buildPkwSubtitle,
  hasPkwStammdatenValue,
  PKW_STAMMDATEN_HEAD_KEY,
  PKW_STAMMDATEN_STATUS_KEY,
} from "../../lib/pkw-stammdaten";
import type { PkwFahrzeugFormField } from "../../lib/pkw";
import type { Kunde } from "../../lib/types/pkw";
import { stammdatenStatusClassName } from "../../lib/machines";

type Props = {
  fields: PkwFahrzeugFormField[];
  form: Record<string, string>;
  isEditing: boolean;
  canWrite: boolean;
  kundeId: string;
  kunden: Kunde[];
  kundeDisplay: string;
  aktiv: boolean;
  bild?: string | null;
  qrImageUrl?: string | null;
  kennzeichen: string;
  onUpdate: (key: string, value: string) => void;
  onKundeChange: (kundeId: string) => void;
  saveError?: string | null;
  mediaFooter?: ReactNode;
  showQrCode?: boolean;
};

function StammdatenReadOnlyValue({ value }: { value: string }) {
  return (
    <span className="fieldRowDisplayValue">{hasPkwStammdatenValue(value) ? value : "—"}</span>
  );
}

/** Gleiches Stammdaten-Layout wie Maschinen-Detail */
export default function PkwStammdatenPanelContent({
  fields,
  form,
  isEditing,
  canWrite,
  kundeId,
  kunden,
  kundeDisplay,
  aktiv,
  bild,
  qrImageUrl,
  kennzeichen,
  onUpdate,
  onKundeChange,
  saveError = null,
  mediaFooter = null,
  showQrCode = true,
}: Props) {
  const subtitle = buildPkwSubtitle(form);
  const rows = buildPkwStammdatenRows(fields, form, isEditing);
  const showKunde = isEditing || kundeId || kundeDisplay !== "Firmenfahrzeug";
  const headKey = PKW_STAMMDATEN_HEAD_KEY;
  const headRow = rows.find((row) => row.key === headKey);
  const bodyRows = rows.filter((row) => row.key !== headKey);

  function renderFieldRow(row: (typeof rows)[number]) {
    return (
            <div key={row.key} className="fieldRow">
              <span>
                {row.label}
                {row.required ? " *" : ""}
              </span>
              {row.key === PKW_STAMMDATEN_HEAD_KEY ? (
                isEditing ? (
                  <input
                    type="text"
                    value={row.value}
                    readOnly={!canWrite}
                    onChange={(e) => onUpdate(row.key, e.target.value)}
                    placeholder={row.placeholder ?? "Kennzeichen"}
                    required={Boolean(row.required)}
                  />
                ) : (
                  <span className="fieldRowCombinedValue">
                    {row.value}
                    {hasPkwStammdatenValue(subtitle) ? (
                      <>
                        {" "}
                        — {subtitle}
                      </>
                    ) : null}
                  </span>
                )
              ) : row.type === "date" ? (
                isEditing ? (
                  <GermanDateField
                    value={row.value}
                    onChange={(value) => onUpdate(row.key, value)}
                  />
                ) : (
                  <StammdatenReadOnlyValue value={row.value} />
                )
              ) : isEditing ? (
                <input
                  type="text"
                  value={row.value}
                  readOnly={!canWrite}
                  onChange={(e) => onUpdate(row.key, e.target.value)}
                  placeholder={row.placeholder ?? row.label}
                  inputMode={row.inputMode}
                  required={Boolean(row.required)}
                />
              ) : (
                <StammdatenReadOnlyValue value={row.value} />
              )}
            </div>
    );
  }

  return (
    <div className="stammdatenPanelLayout">
      <div className="stammdatenPanelMain">
        <div className="fieldGrid stammdatenStacked">
          {headRow ? renderFieldRow(headRow) : null}

          {showKunde ? (
            <div className="fieldRow">
              <span>Kunde</span>
              {isEditing ? (
                <select value={kundeId} onChange={(e) => onKundeChange(e.target.value)}>
                  <option value="">— kein Kunde (Firmenfahrzeug) —</option>
                  {kunden.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {[entry.kundennummer, entry.nachname, entry.firma]
                        .filter(Boolean)
                        .join(" · ")}
                    </option>
                  ))}
                </select>
              ) : (
                <StammdatenReadOnlyValue value={kundeDisplay} />
              )}
            </div>
          ) : null}

          {bodyRows.map((row) => renderFieldRow(row))}

          <div className="fieldRow">
            <span>Fahrzeugstatus</span>
            {isEditing ? (
              <select
                value={aktiv ? "aktiv" : "inaktiv"}
                disabled={!canWrite}
                onChange={(e) => onUpdate(PKW_STAMMDATEN_STATUS_KEY, e.target.value)}
              >
                <option value="aktiv">Aktiv</option>
                <option value="inaktiv">Inaktiv</option>
              </select>
            ) : (
              <strong
                className={`geraetstatusValue ${stammdatenStatusClassName(aktiv ? "Fertig" : "In Reperatur")}`}
              >
                {aktiv ? "Aktiv" : "Inaktiv"}
              </strong>
            )}
          </div>
        </div>
        {saveError ? <p style={{ color: "#dc2626" }}>{saveError}</p> : null}
      </div>
      <aside className="stammdatenPanelMedia" aria-label="Fahrzeugbild und QR-Code">
        <PkwHeroMedia
          bild={bild}
          qrImageUrl={qrImageUrl}
          kennzeichen={kennzeichen}
          className="stammdatenPanelHeroMedia machineHeroMediaFrameless"
          showQrCode={showQrCode}
        />
        {mediaFooter}
      </aside>
    </div>
  );
}
