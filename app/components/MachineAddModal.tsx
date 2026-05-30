"use client";

import { useEffect, useState } from "react";
import MachineStammdatenPanelContent from "./MachineStammdatenPanelContent";
import {
  buildStammdatenPatch,
  createMachine,
  machineToStammdatenFields,
  type StammdatenField,
} from "../../lib/machines";
import type { Machine } from "../../lib/types/machine";

const TABS = [
  "Stammdaten",
  "Motor",
  "Technische Daten",
  "Schmierstoffe",
  "Anbaugeräte",
  "Wartungstabelle",
  "Dokumentation",
  "Zubehör",
] as const;

const EMPTY_MACHINE: Machine = {
  id: "",
  created_at: "",
  geraetenummer: null,
  depot: null,
  baujahr: null,
  tpg_hebetechnik: null,
  elektro_ove: null,
  serial_number: null,
  subgroup: null,
};

type Props = {
  open: boolean;
  canWrite: boolean;
  onClose: () => void;
  onSaved: (machine: Machine) => void;
};

export default function MachineAddModal({ open, canWrite, onClose, onSaved }: Props) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Stammdaten");
  const [stammdatenForm, setStammdatenForm] = useState<StammdatenField[]>(() =>
    machineToStammdatenFields(null)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setActiveTab("Stammdaten");
    setStammdatenForm(machineToStammdatenFields(null));
    setFormError(null);
    setSaving(false);
  }, [open]);

  if (!open) return null;

  function updateStammdatenField(index: number, value: string) {
    setStammdatenForm((prev) =>
      prev.map((field, i) => (i === index ? { ...field, value } : field))
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) {
      setFormError("Keine Berechtigung: machines.write erforderlich.");
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = buildStammdatenPatch(EMPTY_MACHINE, stammdatenForm);
    const { data, error } = await createMachine(payload);

    if (error) {
      setFormError(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    if (data) {
      onSaved(data as Machine);
    }
  }

  return (
    <div className="qrModalBackdrop machineAddModalBackdrop">
      <form
        className="machineAddModal machineDetailPage"
        onSubmit={handleSubmit}
        aria-labelledby="machine-add-title"
      >
        <div className="machineAddModalHeader">
          <div>
            <h2 id="machine-add-title" className="machineAddModalTitle">
              Maschine hinzufügen
            </h2>
            <p className="subtitle">Neue Maschine — Stammdaten erfassen.</p>
          </div>
          <button type="button" className="pillButton outline" onClick={onClose}>
            Schließen
          </button>
        </div>

        <div className="machineDetailBody">
          <div className="tabSection">
            <div className="tabList">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`tabButton ${activeTab === tab ? "active" : ""}`}
                  disabled={tab !== "Stammdaten"}
                  aria-disabled={tab !== "Stammdaten"}
                  title={
                    tab !== "Stammdaten"
                      ? "Nach dem Speichern auf der Maschinen-Detailseite verfügbar"
                      : undefined
                  }
                  onClick={() => {
                    if (tab === "Stammdaten") setActiveTab(tab);
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="tabPanel">
              <MachineStammdatenPanelContent
                machine={EMPTY_MACHINE}
                stammdatenForm={stammdatenForm}
                isEditing
                canWrite={canWrite}
                onUpdateField={updateStammdatenField}
                saveError={formError}
                showQrCode={false}
              />
            </div>
          </div>
        </div>

        <div className="machineAddModalActions">
          <button type="button" className="pillButton outline" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className="pillButton primary" disabled={saving || !canWrite}>
            {saving ? "Speichern…" : "Maschine speichern"}
          </button>
        </div>
      </form>
    </div>
  );
}
