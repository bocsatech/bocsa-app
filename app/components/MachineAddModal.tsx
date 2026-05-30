"use client";

import { useEffect, useState } from "react";
import MachineDetailTabPanels from "./MachineDetailTabPanels";
import {
  buildStammdatenPatch,
  createMachine,
  machineToStammdatenFields,
  type StammdatenField,
} from "../../lib/machines";
import { stripWorkOrdersFromTabData } from "../../lib/machine-tab-data";
import {
  buildMachineTabDataPayload,
  createEmptyMachineTabForms,
  MACHINE_DETAIL_TABS,
  type MachineDetailTab,
  type MachineTabFormState,
} from "../../lib/machine-tab-forms";
import type { Machine } from "../../lib/types/machine";

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
  const [activeTab, setActiveTab] = useState<MachineDetailTab>("Stammdaten");
  const [stammdatenForm, setStammdatenForm] = useState<StammdatenField[]>(() =>
    machineToStammdatenFields(null)
  );
  const [tabForms, setTabForms] = useState<MachineTabFormState>(createEmptyMachineTabForms);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setActiveTab("Stammdaten");
    setStammdatenForm(machineToStammdatenFields(null));
    setTabForms(createEmptyMachineTabForms());
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
    payload.machine_tab_data = stripWorkOrdersFromTabData({
      ...((payload.machine_tab_data as Record<string, unknown> | undefined) ?? {}),
      ...buildMachineTabDataPayload(tabForms),
    });

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
            <p className="subtitle">Neue Maschine — alle Register erfassen.</p>
          </div>
          <button type="button" className="pillButton outline" onClick={onClose}>
            Schließen
          </button>
        </div>

        <div className="machineDetailBody">
          <div className="tabSection">
            <div className="tabList">
              {MACHINE_DETAIL_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`tabButton ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="tabPanel">
              <MachineDetailTabPanels
                activeTab={activeTab}
                isEditing
                canWrite={canWrite}
                machine={EMPTY_MACHINE}
                stammdatenForm={stammdatenForm}
                onUpdateStammdatenField={updateStammdatenField}
                saveError={formError}
                showQrCode={false}
                motorData={tabForms.motor}
                setMotorData={(motor) => setTabForms((prev) => ({ ...prev, motor }))}
                technicalData={tabForms.technical}
                setTechnicalData={(technical) =>
                  setTabForms((prev) => ({ ...prev, technical }))
                }
                lubricantData={tabForms.lubricants}
                setLubricantData={(lubricants) =>
                  setTabForms((prev) => ({ ...prev, lubricants }))
                }
                attachmentData={tabForms.attachments}
                setAttachmentData={(attachments) =>
                  setTabForms((prev) => ({ ...prev, attachments }))
                }
                maintenanceData={tabForms.maintenance}
                setMaintenanceData={(maintenance) =>
                  setTabForms((prev) => ({ ...prev, maintenance }))
                }
                documentationData={tabForms.documentation}
                canUploadDocuments={false}
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
