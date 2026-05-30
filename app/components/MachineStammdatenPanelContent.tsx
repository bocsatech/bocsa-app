"use client";

import type { ReactNode } from "react";
import GermanDateField from "./GermanDateField";
import GeraetenummerCodesManager from "./GeraetenummerCodesManager";
import GeraetenummerPicker from "./GeraetenummerPicker";
import MachineHeroMedia from "./MachineHeroMedia";
import type { GeraetenummerCodesConfig, GeraetenummerPick } from "../../lib/geraetenummer";
import {
  GERAETTYP_OPTIONS,
  hasValue,
  sanitizeNumericFieldInput,
  stammdatenStatusClassName,
  type StammdatenField,
} from "../../lib/machines";
import type { Machine } from "../../lib/types/machine";

type Props = {
  machine: Machine;
  stammdatenForm: StammdatenField[];
  isEditing: boolean;
  canWrite: boolean;
  onUpdateField: (index: number, value: string) => void;
  saveError?: string | null;
  mediaFooter?: ReactNode;
  showQrCode?: boolean;
  useStructuredGeraetenummer?: boolean;
  geraetenummerCodes?: GeraetenummerCodesConfig | null;
  geraetenummerPick?: GeraetenummerPick;
  onGeraetenummerPickChange?: (pick: GeraetenummerPick) => void;
  geraetenummerPreviewSequence?: number | null;
  geraetenummerPreviewLoading?: boolean;
  canManageGeraetenummerCodes?: boolean;
  onGeraetenummerCodesChange?: (codes: GeraetenummerCodesConfig) => void;
};

export function buildStammdatenRowsForDisplay(
  stammdatenForm: StammdatenField[],
  isEditing: boolean,
  options?: { hideGeraetenummer?: boolean }
) {
  const visibleStammdatenForm = isEditing
    ? stammdatenForm
    : stammdatenForm.filter((field) => hasValue(field.value));

  const bezeichnungStammdaten = stammdatenForm.find((f) => f.dbKey === "bezeichnung");

  let rows = visibleStammdatenForm.filter((field) => field.dbKey !== "bezeichnung");
  if (options?.hideGeraetenummer) {
    rows = rows.filter((field) => field.dbKey !== "geraetenummer");
  }
  if (isEditing && bezeichnungStammdaten) {
    const geraeteIndex = rows.findIndex((field) => field.dbKey === "geraetenummer");
    const insertAt = geraeteIndex >= 0 ? geraeteIndex + 1 : 0;
    rows = [
      ...rows.slice(0, insertAt),
      bezeichnungStammdaten,
      ...rows.slice(insertAt),
    ];
  }
  const meldung = rows.filter((field) => field.dbKey === "meldung_status");
  const rest = rows.filter((field) => field.dbKey !== "meldung_status");
  return [...rest, ...meldung];
}

/** Gleiches Stammdaten-Layout wie Maschinen-Detail / Stammdaten-Tab */
export default function MachineStammdatenPanelContent({
  machine,
  stammdatenForm,
  isEditing,
  canWrite,
  onUpdateField,
  saveError = null,
  mediaFooter = null,
  showQrCode = true,
  useStructuredGeraetenummer = false,
  geraetenummerCodes = null,
  geraetenummerPick = { marke: "", klasse: "", art: "" },
  onGeraetenummerPickChange,
  geraetenummerPreviewSequence = null,
  geraetenummerPreviewLoading = false,
  canManageGeraetenummerCodes = false,
  onGeraetenummerCodesChange,
}: Props) {
  const bezeichnungStammdaten = stammdatenForm.find((f) => f.dbKey === "bezeichnung");
  const stammdatenRowsForDisplay = buildStammdatenRowsForDisplay(
    stammdatenForm,
    isEditing,
    { hideGeraetenummer: useStructuredGeraetenummer }
  );

  return (
    <div className="stammdatenPanelLayout">
      <div className="stammdatenPanelMain">
        {useStructuredGeraetenummer && geraetenummerCodes && onGeraetenummerPickChange ? (
          <>
            <GeraetenummerPicker
              codes={geraetenummerCodes}
              pick={geraetenummerPick}
              onPickChange={onGeraetenummerPickChange}
              previewSequence={geraetenummerPreviewSequence}
              previewLoading={geraetenummerPreviewLoading}
              disabled={!canWrite}
            />
            {canManageGeraetenummerCodes && onGeraetenummerCodesChange ? (
              <GeraetenummerCodesManager
                codes={geraetenummerCodes}
                onCodesChange={onGeraetenummerCodesChange}
              />
            ) : null}
          </>
        ) : null}
        <div className="fieldGrid stammdatenStacked">
          {stammdatenRowsForDisplay.map((field) => {
            const index = stammdatenForm.findIndex((item) => item.label === field.label);
            return (
              <div key={field.label} className="fieldRow">
                <span>{field.label}</span>
                {field.dbKey === "geraetenummer" ? (
                  isEditing ? (
                    <input
                      type="text"
                      value={field.value}
                      readOnly={!canWrite}
                      onChange={(e) => onUpdateField(index, e.target.value)}
                      placeholder="Gerätenummer"
                    />
                  ) : (
                    <span className="fieldRowCombinedValue">
                      {field.value}
                      {hasValue(bezeichnungStammdaten?.value) ? (
                        <>
                          {" "}
                          — {bezeichnungStammdaten?.value}
                        </>
                      ) : null}
                    </span>
                  )
                ) : field.dbKey === "meldung_status" ? (
                  <strong
                    className={
                      field.value.toLowerCase().includes("vorhanden")
                        ? "meldungStatusValue danger"
                        : "meldungStatusValue ok"
                    }
                  >
                    {field.value || "Keine Meldung"}
                  </strong>
                ) : field.dbKey === "geraettyp" ? (
                  <select
                    value={field.value}
                    disabled={!isEditing || useStructuredGeraetenummer}
                    onChange={(e) => onUpdateField(index, e.target.value)}
                  >
                    <option value="">Gerättyp</option>
                    {GERAETTYP_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : field.dbKey === "damage_status" ? (
                  !isEditing ? (
                    <strong
                      className={`geraetstatusValue ${stammdatenStatusClassName(field.value)}`}
                    >
                      {field.value || "—"}
                    </strong>
                  ) : (
                    <select
                      className={`statusSelect ${stammdatenStatusClassName(field.value)}`}
                      value={field.value}
                      onChange={(e) => onUpdateField(index, e.target.value)}
                    >
                      <option value="">Gerätstatus</option>
                      <option value="Fertig">Fertig</option>
                      <option value="In Reperatur">In Reperatur</option>
                    </select>
                  )
                ) : field.type === "date" ? (
                  <GermanDateField
                    value={field.value}
                    readOnly={!isEditing}
                    onChange={(next) => onUpdateField(index, next)}
                  />
                ) : field.dbKey ? (
                  <input
                    type="text"
                    inputMode={field.type === "number" ? "decimal" : undefined}
                    value={field.value}
                    readOnly={!isEditing}
                    onChange={(e) =>
                      onUpdateField(
                        index,
                        field.type === "number"
                          ? sanitizeNumericFieldInput(e.target.value)
                          : e.target.value
                      )
                    }
                    placeholder={field.label}
                  />
                ) : (
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => onUpdateField(index, e.target.value)}
                    placeholder="—"
                    disabled
                  />
                )}
              </div>
            );
          })}
        </div>
        {saveError ? <p style={{ color: "#dc2626" }}>{saveError}</p> : null}
      </div>
      <aside className="stammdatenPanelMedia" aria-label="Maschinenbild und QR-Code">
        <MachineHeroMedia
          machine={machine}
          className="stammdatenPanelHeroMedia machineHeroMediaFrameless"
          showQrCode={showQrCode}
        />
        {mediaFooter}
      </aside>
    </div>
  );
}
