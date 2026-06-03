"use client";

import { useEffect, useState } from "react";
import MachineDetailTabPanels from "./MachineDetailTabPanels";
import {
  buildStammdatenPatch,
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
import {
  DEFAULT_GERAETENUMMER_CODES,
  type GeraetenummerCodesConfig,
  type GeraetenummerPick,
  fetchGeraetenummerCodes,
  fetchNextGeraetenummer,
  deriveGeraetegruppeFromPick,
  geraettypForKlasse,
  validateGeraetenummerPick,
} from "../../lib/geraetenummer";
import {
  fetchGruppenProtokollVorlage,
  normalizeGeraetgruppeVorlage,
  tabDefaultsFromGeraetgruppeVorlage,
} from "../../lib/geraetgruppe-protokoll";
import type { SessionAuthSlice } from "../../lib/machine-permissions";
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

const EMPTY_PICK: GeraetenummerPick = { marke: "", klasse: "", art: "" };

type Props = {
  open: boolean;
  canCreate: boolean;
  sessionAuth: SessionAuthSlice;
  onClose: () => void;
  onSaved: (machine: Machine) => void;
};

export default function MachineAddModal({
  open,
  canCreate,
  sessionAuth,
  onClose,
  onSaved,
}: Props) {
  const [activeTab, setActiveTab] = useState<MachineDetailTab>("Stammdaten");
  const [stammdatenForm, setStammdatenForm] = useState<StammdatenField[]>(() =>
    machineToStammdatenFields(null)
  );
  const [tabForms, setTabForms] = useState<MachineTabFormState>(createEmptyMachineTabForms);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [geraetenummerCodes, setGeraetenummerCodes] =
    useState<GeraetenummerCodesConfig>(DEFAULT_GERAETENUMMER_CODES);
  const [geraetenummerPick, setGeraetenummerPick] = useState<GeraetenummerPick>(EMPTY_PICK);
  const [previewSequence, setPreviewSequence] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setActiveTab("Stammdaten");
    setStammdatenForm(machineToStammdatenFields(null));
    setTabForms(createEmptyMachineTabForms());
    setFormError(null);
    setSaving(false);
    setGeraetenummerPick(EMPTY_PICK);
    setPreviewSequence(null);

    void fetchGeraetenummerCodes().then(({ data, error }) => {
      if (data) setGeraetenummerCodes(data);
      if (error) setFormError(error.message);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const geraettyp = geraettypForKlasse(geraetenummerCodes, geraetenummerPick.klasse);
    if (!geraettyp) return;

    setStammdatenForm((prev) =>
      prev.map((field) =>
        field.dbKey === "geraettyp" ? { ...field, value: geraettyp } : field
      )
    );
  }, [open, geraetenummerCodes, geraetenummerPick.klasse]);

  useEffect(() => {
    if (!open) return;
    const gruppe = deriveGeraetegruppeFromPick(geraetenummerPick);
    if (!gruppe) return;

    setStammdatenForm((prev) =>
      prev.map((field) =>
        field.dbKey === "subgroup" ? { ...field, value: gruppe } : field
      )
    );
  }, [open, geraetenummerPick.klasse, geraetenummerPick.art]);

  useEffect(() => {
    if (!open) return;
    const gruppe = deriveGeraetegruppeFromPick(geraetenummerPick);
    if (!gruppe) return;

    let cancelled = false;
    void fetchGruppenProtokollVorlage(gruppe).then(({ data, error }) => {
      if (cancelled || error || !data?.vorlage) return;
      const tabs = tabDefaultsFromGeraetgruppeVorlage(
        normalizeGeraetgruppeVorlage(data.vorlage)
      );
      setTabForms((prev) => ({
        ...prev,
        motor: tabs.motor,
        technical: tabs.technical,
        lubricants: tabs.lubricants,
        maintenance: tabs.maintenance,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [open, geraetenummerPick.klasse, geraetenummerPick.art]);

  useEffect(() => {
    if (!open) return;
    const validationError = validateGeraetenummerPick(geraetenummerCodes, geraetenummerPick);
    if (validationError) {
      setPreviewSequence(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    void fetchNextGeraetenummer(geraetenummerPick).then(({ data, error }) => {
      if (cancelled) return;
      setPreviewLoading(false);
      if (error) {
        setPreviewSequence(null);
        return;
      }
      setPreviewSequence(data?.sequence ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [open, geraetenummerCodes, geraetenummerPick]);

  if (!open) return null;

  function updateStammdatenField(index: number, value: string) {
    setStammdatenForm((prev) =>
      prev.map((field, i) => (i === index ? { ...field, value } : field))
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) {
      setFormError("Keine Berechtigung: machines.create erforderlich.");
      return;
    }

    const pickError = validateGeraetenummerPick(geraetenummerCodes, geraetenummerPick);
    if (pickError) {
      setFormError(pickError);
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = buildStammdatenPatch(EMPTY_MACHINE, stammdatenForm);
    delete payload.geraetenummer;
    payload.machine_tab_data = stripWorkOrdersFromTabData({
      ...((payload.machine_tab_data as Record<string, unknown> | undefined) ?? {}),
      ...buildMachineTabDataPayload(tabForms),
    });

    const response = await fetch("/api/machines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...payload,
        geraetenummer_pick: geraetenummerPick,
      }),
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setFormError(result?.error ?? "Maschine konnte nicht erstellt werden.");
      setSaving(false);
      return;
    }

    setSaving(false);
    if (result) {
      onSaved(result as Machine);
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
            <p className="subtitle">Neue Maschine — Gerätenummer aus Auswahl, alle Register erfassen.</p>
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
                canWrite={canCreate}
                sessionAuth={sessionAuth}
                creating
                machine={EMPTY_MACHINE}
                stammdatenForm={stammdatenForm}
                onUpdateStammdatenField={updateStammdatenField}
                saveError={formError}
                showQrCode={false}
                useStructuredGeraetenummer
                geraetenummerCodes={geraetenummerCodes}
                geraetenummerPick={geraetenummerPick}
                onGeraetenummerPickChange={setGeraetenummerPick}
                geraetenummerPreviewSequence={previewSequence}
                geraetenummerPreviewLoading={previewLoading}
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
          <button type="submit" className="pillButton primary" disabled={saving || !canCreate}>
            {saving ? "Speichern…" : "Maschine speichern"}
          </button>
        </div>
      </form>
    </div>
  );
}
