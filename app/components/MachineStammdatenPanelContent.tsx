"use client";

import type { ReactNode } from "react";
import GermanDateField from "./GermanDateField";
import GeraetenummerPicker from "./GeraetenummerPicker";
import MachineHeroMedia from "./MachineHeroMedia";
import type { GeraetenummerCodesConfig, GeraetenummerPick } from "../../lib/geraetenummer";
import {
  canEditStammdatenField,
  type SessionAuthSlice,
} from "../../lib/machine-permissions";
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
  sessionAuth: SessionAuthSlice;
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
  /** Neuanlage: Identitätsfelder mit machines.create bearbeitbar */
  creating?: boolean;
  /** Freitext unter Gerätstatus (machine_tab_data.note) */
  note?: string;
  onNoteChange?: (value: string) => void;
};

/** Feste Kopfreihenfolge im Stammdaten-Tab (Gerätegruppe direkt über Gerättyp). */
export const STAMMDATEN_HEAD_FIELD_KEYS = [
  "geraetenummer",
  "subgroup",
  "geraettyp",
] as const;

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

  const trailingKeys = new Set<string>(STAMMDATEN_TRAILING_FIELD_KEYS);
  const used = new Set<string>();
  const ordered: StammdatenField[] = [];

  function take(key: string) {
    const field = rows.find((row) => row.dbKey === key);
    if (!field?.dbKey || used.has(field.dbKey)) return;
    ordered.push(field);
    used.add(field.dbKey);
  }

  take("geraetenummer");
  if (isEditing && bezeichnungStammdaten) {
    ordered.push(bezeichnungStammdaten);
    used.add("bezeichnung");
  }
  take("subgroup");
  take("geraettyp");

  for (const field of rows) {
    if (!field.dbKey || used.has(field.dbKey) || trailingKeys.has(field.dbKey)) continue;
    ordered.push(field);
    used.add(field.dbKey);
  }

  for (const key of STAMMDATEN_TRAILING_FIELD_KEYS) {
    take(key);
  }

  return ordered;
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
  sessionAuth,
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
  creating = false,
  note = "",
  onNoteChange,
}: Props) {
  const fieldEditOpts = creating ? { creating: true as const } : undefined;
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
              disabled={
                !canEditStammdatenField(sessionAuth, "geraetenummer", isEditing, fieldEditOpts)
              }
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
                      readOnly={
                        !canEditStammdatenField(sessionAuth, field.dbKey, isEditing, fieldEditOpts)
                      }
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
                      disabled={
                        useStructuredGeraetenummer ||
                        !canEditStammdatenField(
                          sessionAuth,
                          field.dbKey,
                          isEditing,
                          fieldEditOpts
                        )
                      }
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
                      readOnly={
                        !canEditStammdatenField(sessionAuth, field.dbKey, isEditing, fieldEditOpts)
                      }
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
          {onNoteChange && (isEditing || note.trim()) ? (
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
