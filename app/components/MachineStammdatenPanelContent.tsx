"use client";

import type { ReactNode } from "react";
import GermanDateField from "./GermanDateField";
import GeraetenummerPicker from "./GeraetenummerPicker";
import MachineHeroMedia from "./MachineHeroMedia";
import type { GeraetenummerCodesConfig, GeraetenummerPick } from "../../lib/geraetenummer";
import {
  GERAETTYP_OPTIONS,
  STAMMDATEN_TRAILING_FIELD_KEYS,
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
  /** Freitext unter Gerätegruppe (machine_tab_data.note) */
  note?: string;
  onNoteChange?: (value: string) => void;
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
  const trailing = STAMMDATEN_TRAILING_FIELD_KEYS.flatMap((key) => {
    const field = rows.find((row) => row.dbKey === key);
    return field ? [field] : [];
  });
  const trailingKeys = new Set<string>(STAMMDATEN_TRAILING_FIELD_KEYS);
  const rest = rows.filter((field) => !field.dbKey || !trailingKeys.has(field.dbKey));
  return [...rest, ...trailing];
}

function StammdatenReadOnlyValue({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  return (
    <span className={["fieldRowDisplayValue", className].filter(Boolean).join(" ")}>
      {value?.trim() ? value : "—"}
    </span>
  );
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
  note = "",
  onNoteChange,
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
                  !isEditing ? (
                    <StammdatenReadOnlyValue value={field.value} />
                  ) : (
                    <select
                      value={field.value}
                      disabled={useStructuredGeraetenummer}
                      onChange={(e) => onUpdateField(index, e.target.value)}
                    >
                      <option value="">Gerättyp</option>
                      {GERAETTYP_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )
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
                  !isEditing ? (
                    <StammdatenReadOnlyValue value={field.value} />
                  ) : (
                    <GermanDateField
                      value={field.value}
                      onChange={(next) => onUpdateField(index, next)}
                    />
                  )
                ) : field.dbKey ? (
                  !isEditing ? (
                    <StammdatenReadOnlyValue value={field.value} />
                  ) : (
                    <input
                      type="text"
                      inputMode={field.type === "number" ? "decimal" : undefined}
                      value={field.value}
                      readOnly={!canWrite}
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
                  )
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
          {onNoteChange ? (
            <div className="fieldRow">
              <span>Bemerkung</span>
              {isEditing ? (
                <textarea
                  className="stammdatenBemerkungField"
                  rows={3}
                  value={note}
                  readOnly={!canWrite}
                  onChange={(e) => onNoteChange(e.target.value)}
                  placeholder="Bemerkung zur Maschine…"
                />
              ) : (
                <StammdatenReadOnlyValue value={note} />
              )}
            </div>
          ) : null}
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
