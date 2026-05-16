"use client";

import Link from "next/link";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  GERAETTYP_OPTIONS,
  hasValue,
  machineToStammdatenFields,
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

    return (
      <div className="tabSection arbeitsauftragHideOnPrint">
        <div className="tabList">
          <button type="button" className="tabButton active">
            Stammdaten
          </button>
        </div>

        <div className={`tabPanel ${editable ? "" : "readOnlyPanel"}`}>
          <h2>Stammdaten</h2>
          <div className="fieldGrid">
            {stammdatenForm.map((field, index) => {
              if (!editable && !hasValue(field.value)) return null;
              return (
                <div key={field.label} className="fieldRow">
                  <span>{field.label}</span>
                  {field.dbKey === "meldung_status" ? (
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
                      disabled={!editable || !canWrite}
                      onChange={(e) => updateField(index, e.target.value)}
                    >
                      <option value="">Gerättyp</option>
                      {GERAETTYP_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.dbKey === "damage_status" ? (
                    <select
                      className={`statusSelect ${stammdatenStatusClassName(field.value)}`}
                      value={field.value}
                      disabled={!editable || !canWrite}
                      onChange={(e) => updateField(index, e.target.value)}
                    >
                      <option value="">Gerätstatus</option>
                      <option value="Fertig">Fertig</option>
                      <option value="In Reperatur">In Reperatur</option>
                    </select>
                  ) : field.dbKey ? (
                    <input
                      type={field.type === "date" ? "text" : field.type ?? "text"}
                      value={field.value}
                      readOnly={!editable || !canWrite}
                      onChange={(e) => updateField(index, e.target.value)}
                      placeholder={field.type === "date" ? "TT.MM.JJJJ" : field.label}
                    />
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
