"use client";

import Link from "next/link";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import GermanDateField from "./GermanDateField";
import {
  ARBEITSAUFTRAG_SHEET_SKIP_FIELDS,
  GERAETTYP_OPTIONS,
  formatMachineGeraetenummerLine,
  formatValue,
  hasValue,
  machineToStammdatenFields,
  sanitizeNumericFieldInput,
  stammdatenFieldHasContent,
  stammdatenStatusClassName,
  type StammdatenField,
} from "../../lib/machines";
import type { Machine } from "../../lib/types/machine";

export type MachineStammdatenPanelHandle = {
  getFields: () => StammdatenField[];
};

type Props = {
  machine: Machine | null;
  canWrite: boolean;
  saving?: boolean;
  saveError?: string | null;
  onSave: (fields: StammdatenField[]) => Promise<boolean>;
  /** Alle Felder sofort bearbeitbar, ohne Bearbeiten/Speichern/Beenden */
  alwaysEditing?: boolean;
  showActions?: boolean;
  beendenHref?: string;
  /** Ohne Tab-Leiste / Kartenrahmen (z. B. Arbeitsauftrag-Übersicht) */
  embedded?: boolean;
  /** Leere Felder ausblenden (Arbeitsblatt-Bearbeiten: false = alle Zeilen) */
  hideEmptyFields?: boolean;
  /** Überschrift „Stammdaten“ ausblenden */
  showTitle?: boolean;
  /** Arbeitsauftrag: Gerätenummer-Zeile + Felder wie Munkalap */
  sheetLayout?: boolean;
};

const MachineStammdatenPanel = forwardRef<MachineStammdatenPanelHandle, Props>(
  function MachineStammdatenPanel(
    {
      machine,
      canWrite,
      saving = false,
      saveError = null,
      onSave,
      alwaysEditing = false,
      showActions = true,
      beendenHref = "/maschinen",
      embedded = false,
      hideEmptyFields = false,
      showTitle = true,
      sheetLayout = false,
    },
    ref
  ) {
    const [isEditing, setIsEditing] = useState(alwaysEditing);
    const [stammdatenForm, setStammdatenForm] = useState<StammdatenField[]>([]);
    const editable = alwaysEditing || isEditing;

    useEffect(() => {
      setStammdatenForm(machineToStammdatenFields(machine));
      if (!alwaysEditing) setIsEditing(false);
    }, [machine, alwaysEditing]);

    useImperativeHandle(ref, () => ({
      getFields: () => stammdatenForm,
    }));

    function updateField(index: number, value: string) {
      setStammdatenForm((prev) =>
        prev.map((field, i) => (i === index ? { ...field, value } : field))
      );
    }

    async function handleSave() {
      const ok = await onSave(stammdatenForm);
      if (ok) setIsEditing(false);
    }

    function fieldVisible(field: StammdatenField) {
      if (sheetLayout && editable) return true;
      if (hideEmptyFields && !stammdatenFieldHasContent(field)) return false;
      if (!editable && !hasValue(field.value)) return false;
      return true;
    }

    return (
      <div
        className={[
          embedded ? "tabSectionEmbedded" : "tabSection",
          "arbeitsauftragHideOnPrint",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {!embedded ? (
          <div className="tabList">
            <button type="button" className="tabButton active">
              Stammdaten
            </button>
          </div>
        ) : null}

        <div className={`tabPanel ${editable ? "" : "readOnlyPanel"}`}>
          {showTitle ? <h2 className="aaStammdatenHeading">Stammdaten</h2> : null}
          <div
            className={[
              "fieldGrid aaStammdatenGrid",
              embedded || sheetLayout ? "stammdatenStacked aaSheetFieldTable" : "",
              sheetLayout ? "aaWorksheetStammdaten" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {sheetLayout ? (
              <div className="fieldRow aaFieldRow aaSheetHeroRow">
                <span>Gerätenummer</span>
                <strong className="aaWorksheetValue aaSheetFieldValueHero">
                  {formatMachineGeraetenummerLine(machine) ||
                    formatValue(machine?.geraetenummer)}
                </strong>
              </div>
            ) : null}
            {stammdatenForm.map((field, index) => {
              if (sheetLayout && field.dbKey && ARBEITSAUFTRAG_SHEET_SKIP_FIELDS.has(field.dbKey)) {
                return null;
              }
              if (!fieldVisible(field)) return null;
              const rowClass = sheetLayout || embedded ? "fieldRow aaFieldRow" : "fieldRow";
              return (
                <div key={field.label} className={rowClass}>
                  <span>{field.label}</span>
                  {field.dbKey === "meldung_status" ? (
                    <strong
                      className={
                        field.value.toLowerCase().includes("vorhanden")
                          ? sheetLayout
                            ? "aaWorksheetValue meldungStatusValue danger"
                            : "meldungStatusValue danger"
                          : sheetLayout
                            ? "aaWorksheetValue meldungStatusValue ok"
                            : "meldungStatusValue ok"
                      }
                    >
                      {field.value || "Keine Meldung"}
                    </strong>
                  ) : field.dbKey === "geraettyp" ? (
                    !editable ? (
                      <span className="fieldRowDisplayValue">
                        {field.value?.trim() ? field.value : "—"}
                      </span>
                    ) : (
                      <select
                        value={field.value}
                        disabled={!canWrite}
                        onChange={(e) => updateField(index, e.target.value)}
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
                    <select
                      className={[
                        "statusSelect",
                        stammdatenStatusClassName(field.value),
                        sheetLayout ? "aaWorksheetValue" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      value={field.value}
                      disabled={!editable || !canWrite}
                      onChange={(e) => updateField(index, e.target.value)}
                    >
                      <option value="">Gerätstatus</option>
                      <option value="Fertig">Fertig</option>
                      <option value="In Reperatur">In Reperatur</option>
                    </select>
                  ) : field.type === "date" ? (
                    !editable ? (
                      <span className="fieldRowDisplayValue">
                        {field.value?.trim() ? field.value : "—"}
                      </span>
                    ) : (
                      <GermanDateField
                        value={field.value}
                        readOnly={!canWrite}
                        onChange={(next) => updateField(index, next)}
                        openPickerOnFocus
                        pickerVariant="calendar"
                      />
                    )
                  ) : field.dbKey ? (
                    !editable ? (
                      <span className="fieldRowDisplayValue">
                        {field.value?.trim() ? field.value : "—"}
                      </span>
                    ) : (
                      <input
                        type="text"
                        inputMode={field.type === "number" ? "decimal" : undefined}
                        value={field.value}
                        readOnly={!canWrite}
                        onChange={(e) =>
                          updateField(
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
                    <input type="text" value={field.value} placeholder="—" disabled />
                  )}
                </div>
              );
            })}
          </div>

          {saveError ? <p style={{ color: "#dc2626" }}>{saveError}</p> : null}

          {showActions ? (
            <div className="actionGroup">
              {canWrite ? (
                <button
                  type="button"
                  className="pillButton outline"
                  onClick={() => setIsEditing((value) => !value)}
                >
                  {isEditing ? "Bearbeitung beenden" : "Bearbeiten"}
                </button>
              ) : null}
              <button
                className="pillButton primary"
                type="button"
                onClick={handleSave}
                disabled={saving || !isEditing || !canWrite}
              >
                {saving ? "Speichern…" : "Speichern"}
              </button>
              <Link className="pillButton outline" href={beendenHref}>
                Beenden
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
);

export default MachineStammdatenPanel;
