"use client";

import type { LubricantFormData, MotorFormData, TechnicalFormData } from "../../lib/machine-tab-forms";
import {
  LUBRICANT_TAB_FIELDS,
  MOTOR_TAB_FIELDS,
  TECHNICAL_TAB_FIELDS,
  type TabFieldDef,
} from "../../lib/geraetgruppe-tab-fields";

type Props = {
  motor: MotorFormData;
  technical: TechnicalFormData;
  lubricants: LubricantFormData;
  onMotorChange: (value: MotorFormData) => void;
  onTechnicalChange: (value: TechnicalFormData) => void;
  onLubricantsChange: (value: LubricantFormData) => void;
  disabled?: boolean;
};

function FieldGrid<T extends Record<string, unknown>>({
  title,
  fields,
  values,
  onChange,
  disabled,
}: {
  title: string;
  fields: TabFieldDef<T>[];
  values: T;
  onChange: (next: T) => void;
  disabled?: boolean;
}) {
  return (
    <section className="geraetgruppeTabSection card">
      <h3 className="geraetgruppeTabSectionTitle">{title}</h3>
      <div className="fieldGrid geraetgruppeTabFieldGrid">
        {fields.map((field) => {
          const key = field.key;
          const raw = values[key];
          if (field.type === "checkbox") {
            return (
              <div key={key} className="fieldRow checkboxRow">
                <span>{field.label}</span>
                <label className="checkboxLabel">
                  <input
                    type="checkbox"
                    checked={Boolean(raw)}
                    disabled={disabled}
                    onChange={(e) =>
                      onChange({ ...values, [key]: e.target.checked } as T)
                    }
                  />
                  Ja
                </label>
              </div>
            );
          }
          if (field.type === "select") {
            return (
              <div key={key} className="fieldRow">
                <span>{field.label}</span>
                <select
                  value={String(raw ?? "")}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange({ ...values, [key]: e.target.value } as T)
                  }
                >
                  {(field.options ?? [""]).map((opt) => (
                    <option key={opt || "empty"} value={opt}>
                      {opt === ""
                        ? "Bitte wählen…"
                        : opt === "ja"
                          ? "Ja"
                          : opt === "nein"
                            ? "Nein"
                            : opt === "dpfs"
                              ? "Dieselpartikelfilter"
                              : opt === "scr"
                                ? "SCR"
                                : opt === "ecat"
                                  ? "EKAT"
                                  : opt}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          return (
            <div key={key} className="fieldRow">
              <span>{field.label}</span>
              {field.unit ? (
                <div className="inputWithUnit">
                  <input
                    type="text"
                    value={String(raw ?? "")}
                    disabled={disabled}
                    onChange={(e) =>
                      onChange({ ...values, [key]: e.target.value } as T)
                    }
                  />
                  <span>{field.unit}</span>
                </div>
              ) : (
                <input
                  type="text"
                  value={String(raw ?? "")}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange({ ...values, [key]: e.target.value } as T)
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function GeraetgruppeTabDefaultsEditor({
  motor,
  technical,
  lubricants,
  onMotorChange,
  onTechnicalChange,
  onLubricantsChange,
  disabled = false,
}: Props) {
  return (
    <div className="geraetgruppeTabDefaultsStack">
      <p className="subtitle geraetgruppeTabDefaultsHint">
        Standardwerte für neue Maschinen dieser Gerätegruppe (Motor, Technische Daten,
        Schmierstoffe). Am einzelnen Gerät jederzeit änderbar.
      </p>
      <FieldGrid
        title="Motor"
        fields={MOTOR_TAB_FIELDS}
        values={motor}
        onChange={onMotorChange}
        disabled={disabled}
      />
      <FieldGrid
        title="Technische Daten"
        fields={TECHNICAL_TAB_FIELDS}
        values={technical}
        onChange={onTechnicalChange}
        disabled={disabled}
      />
      <FieldGrid
        title="Schmierstoffe"
        fields={LUBRICANT_TAB_FIELDS}
        values={lubricants}
        onChange={onLubricantsChange}
        disabled={disabled}
      />
    </div>
  );
}
