"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import DocumentationDocumentRow from "../../components/DocumentationDocumentRow";
import AppPageShell from "../../components/AppPageShell";
import MaintenanceLagerParts from "../../components/MaintenanceLagerParts";
import MachineStatusIndicators from "../../components/MachineStatusIndicators";
import {
  fetchMachineById,
  formatDate,
  formatValue,
  GERAETTYP_OPTIONS,
  hasValue,
  machineToStammdatenFields,
  updateMachine,
} from "../../../lib/machines";
import type { MachineRecord } from "../../../lib/machines";
import type { Machine } from "../../../lib/types/machine";
import type { StammdatenField } from "../../../lib/machines";
import { stripWorkOrdersFromTabData } from "../../../lib/machine-tab-data";
import {
  formatOrderType,
  formatWorkOrderNumber,
  getWorkOrders,
} from "../../../lib/work-orders";

const ARBEITSAUFTRAG_TYPES = ["Service", "Check", "Reparatur"] as const;

const tabs = [
  "Stammdaten",
  "Motor",
  "Technische Daten",
  "Schmierstoffe",
  "Anbaugeräte",
  "Wartungstabelle",
  "Dokumentation",
  "Zubehör",
  "Dokumente",
];

const tabContent = {
  Stammdaten: "A gépadatok itt szerepelnek, a részleteket a jobb oldalon szerkesztheted.",
  Motor: "Motor adatok és beállítások.",
  "Technische Daten": "Műszaki paraméterek és specifikációk.",
  Schmierstoffe: "Kenőanyagok és a cserére vonatkozó útmutatók.",
  Anbaugeräte: "Csatolható berendezések és kiegészítők listája.",
  Wartungstabelle: "Karbantartási táblázat és ütemezés.",
  Dokumentation: "Dokumentumok és leírások gyűjteménye.",
  Zubehör: "További kiegészítők és alkatrészek.",
  Dokumente: "Letöltések és hivatalos dokumentumok.",
};

const initialMotorData = {
  motorType: "",
  motorNumber: "",
  motorPower: "",
  inletValveClearance: "",
  exhaustValveClearance: "",
  oilPressure: "",
  coolingSystem: "",
  dieselParticulateFilter: false,
  adBlue: "",
  euroEmissionStandard: "",
  emission: "",
  aftertreatmentSystem: "",
  certificate: "",
  fuelTypeConsumption: "",
  partsCatalog: "",
  typePlate: "",
};

const initialTechnicalData = {
  operatingWeight: "",
  totalWidth: "",
  totalHeight: "",
  totalLength: "",
  bucketCapacity: "",
  tireDimension: "",
  tirePressure: "",
  chainDimension: "",
  starterNumber: "",
  alternatorPower: "",
  batteryPowerDimensions: "",
  generatorNumber: "",
  generatorPower: "",
  controllerType: "",
  softwareVersion: "",
  operatingPressure: "",
};

const initialLubricantData = {
  engineOil: "",
  gearboxOil: "",
  compressorOil: "",
  hydraulicOil: "",
  axleOil: "",
  differentialOil: "",
  finalDriveOil: "",
  coolant: "",
  brakeFluid: "",
};

const initialAttachmentData = {
  hdHammer: "",
  spoonNumber: "",
  deepBucket: "",
  mountingPlate: "",
  lightMaterialBucket: "",
  quickCouplerType: "",
  powerTiltType: "",
  replacementPartsWinkelbauer: "",
  matchingAttachments: "",
};

const initialMaintenanceData = {
  parts: [] as Array<{
    lagerTeilId: string;
    herstellernummer: string;
    bezeichnung?: string | null;
    lagerplatz?: string | null;
  }>,
};

const initialDocumentationData = {
  pruefprotokoll: "",
  operatingManual: "",
  sparePartsCatalog: "",
  wiringDiagram: "",
  hydraulicDiagram: "",
  technicalDatasheet: "",
};

type MachineDocumentType =
  | "pruefprotokoll"
  | "betriebsanleitung"
  | "ersatzteilekatalog"
  | "stromlaufplan"
  | "hydraulikplan"
  | "technisches_datenblatt";

const DOCUMENT_UPLOAD_ROWS: Array<{
  type: MachineDocumentType;
  label: string;
  urlKey: keyof typeof initialDocumentationData;
}> = [
  { type: "pruefprotokoll", label: "Prüfprotokoll", urlKey: "pruefprotokoll" },
  { type: "betriebsanleitung", label: "Betriebsanleitung", urlKey: "operatingManual" },
  { type: "ersatzteilekatalog", label: "Ersatzteilekatalog", urlKey: "sparePartsCatalog" },
  { type: "stromlaufplan", label: "Stromlaufplan", urlKey: "wiringDiagram" },
  { type: "hydraulikplan", label: "Hydraulikplan", urlKey: "hydraulicDiagram" },
  { type: "technisches_datenblatt", label: "Techn. Datenblatt", urlKey: "technicalDatasheet" },
];

function objectFromTabData<T extends Record<string, unknown>>(
  tabData: Record<string, unknown> | null | undefined,
  key: string,
  fallback: T
): T {
  const value = tabData?.[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  return { ...fallback, ...(value as Partial<T>) };
}

export default function MaschineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const machineId = params.id as string;

  function openArbeitsauftrag(type: (typeof ARBEITSAUFTRAG_TYPES)[number]) {
    router.push(
      `/arbeitsauftrag?machineId=${encodeURIComponent(machineId)}&status=${encodeURIComponent(type)}`
    );
  }
  const [machine, setMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [canWriteMachines, setCanWriteMachines] = useState(false);
  const [canUploadImages, setCanUploadImages] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState<MachineDocumentType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [stammdatenForm, setStammdatenForm] = useState<StammdatenField[]>([]);
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [note, setNote] = useState("");
  const [motorData, setMotorData] = useState(initialMotorData);
  const [technicalData, setTechnicalData] = useState(initialTechnicalData);
  const [lubricantData, setLubricantData] = useState(initialLubricantData);
  const [attachmentData, setAttachmentData] = useState(initialAttachmentData);
  const [maintenanceData, setMaintenanceData] = useState(initialMaintenanceData);
  const [documentationData, setDocumentationData] = useState(initialDocumentationData);
  const visibleStammdatenForm = isEditing
    ? stammdatenForm
    : stammdatenForm.filter((field) => hasValue(field.value));

  const loadMachine = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const { data, error } = await fetchMachineById(machineId);

    if (error) {
      setLoadError(error.message);
      setMachine(null);
    } else {
      setMachine(data as Machine);
    }

    setLoading(false);
  }, [machineId]);

  useEffect(() => {
    loadMachine();
  }, [loadMachine]);

  useEffect(() => {
    async function loadPermissions() {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "include",
      });
      const result = await response.json().catch(() => ({}));
      setIsAuthenticated(response.ok && Boolean(result.user));
      setCanWriteMachines(Boolean(result.permissions?.includes("machines.write")));
      setCanUploadImages(Boolean(result.groups?.includes("Admin")));
      setAuthChecked(true);
    }

    loadPermissions();
  }, []);

  useEffect(() => {
    setStammdatenForm(machineToStammdatenFields(machine));
    const tabData = machine?.machine_tab_data;
    setNote(typeof tabData?.note === "string" ? tabData.note : "");
    setMotorData(objectFromTabData(tabData, "motor", initialMotorData));
    setTechnicalData(objectFromTabData(tabData, "technical", initialTechnicalData));
    setLubricantData(objectFromTabData(tabData, "lubricants", initialLubricantData));
    setAttachmentData(objectFromTabData(tabData, "attachments", initialAttachmentData));
    const maintenance = objectFromTabData(tabData, "maintenance", initialMaintenanceData);
    setMaintenanceData({
      parts: Array.isArray(maintenance.parts) ? maintenance.parts : [],
    });
    const documentation = objectFromTabData(tabData, "documentation", initialDocumentationData);
    setDocumentationData({
      ...documentation,
      pruefprotokoll:
        typeof tabData?.pruefprotokoll_url === "string"
          ? tabData.pruefprotokoll_url
          : documentation.pruefprotokoll,
      operatingManual:
        typeof tabData?.betriebsanleitung_url === "string"
          ? tabData.betriebsanleitung_url
          : documentation.operatingManual,
    });
  }, [machine]);

  function buildTabData() {
    return {
      note,
      motor: motorData,
      technical: technicalData,
      lubricants: lubricantData,
      attachments: attachmentData,
      maintenance: maintenanceData,
      documentation: documentationData,
    };
  }

  async function handleMachineSave() {
    if (!machine) return;
    if (!canWriteMachines) {
      setSaveError("Keine Berechtigung: machines.write erforderlich.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const patch: Record<string, unknown> = {};
    for (const field of stammdatenForm) {
      if (field.dbKey) {
        const value = field.value.trim();
        if (value || field.dbKey in machine) {
          patch[field.dbKey] = value || null;
        }
      }
    }
    patch.machine_tab_data = stripWorkOrdersFromTabData({
      ...(machine.machine_tab_data ?? {}),
      ...buildTabData(),
    });

    const { data, error } = await updateMachine(machine.id, patch as Partial<Machine>);
    if (error) {
      setSaveError(error.message);
    } else if (data) {
      const updated = data as Machine;
      setMachine(updated);
      setStammdatenForm(machineToStammdatenFields(updated));
      setIsEditing(false);
    }

    setSaving(false);
  }

  async function handleStammdatenSave() {
    await handleMachineSave();
  }

  function updateStammdatenField(index: number, value: string) {
    setStammdatenForm((prev) =>
      prev.map((field, i) => (i === index ? { ...field, value } : field))
    );
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !machine) return;

    if (!canUploadImages) {
      setSaveError("Nur Admin-Benutzer dürfen Maschinenbilder hochladen.");
      return;
    }

    setUploadingImage(true);
    setSaveError(null);

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`/api/machines/${machine.id}/image`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setSaveError(result.error ?? "Bild konnte nicht hochgeladen werden.");
    } else {
      setMachine(result as Machine);
      setStammdatenForm(machineToStammdatenFields(result as Machine));
    }

    setUploadingImage(false);
  }

  async function handleDocumentUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    type: MachineDocumentType
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !machine) return;

    if (!canWriteMachines) {
      setSaveError("Keine Berechtigung: machines.write erforderlich.");
      return;
    }

    setUploadingDocument(type);
    setSaveError(null);

    const formData = new FormData();
    formData.append("type", type);
    formData.append("document", file);

    const response = await fetch(`/api/machines/${machine.id}/document`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setSaveError(result.error ?? "Dokument konnte nicht hochgeladen werden.");
    } else {
      setMachine(result as Machine);
      setStammdatenForm(machineToStammdatenFields(result as Machine));
    }

    setUploadingDocument(null);
  }

  if (authChecked && !isAuthenticated) {
    return (
      <PublicMachineView
        machine={machine}
        machineId={machineId}
        loading={loading}
        loadError={loadError}
      />
    );
  }

  if (!authChecked) {
    return (
      <main className="publicMachinePage">
        <section className="publicMachineCard">
          <p className="scanHint">Maschinendaten werden geladen...</p>
        </section>
      </main>
    );
  }

  return (
    <AppPageShell
      activeHref="/maschinen"
      subtitle="Üzemeltetés"
      contentClassName="machineDetailPage"
      top={
        !loading && machine && !loadError ? (
          <div className="detailTopBar">
            <h1>Maschinen Daten</h1>
            <div className="detailTopActions">
              <Link className="pillButton outline" href="/maschinen">
                Abbrechen
              </Link>
              <Link
                className="pillButton outline"
                href={`/pruefprotokoll/form?machineId=${encodeURIComponent(machineId)}`}
              >
                Prüfprotokoll §11
              </Link>
              <button type="button" className="pillButton outline">
                Dokumente
              </button>
              <button type="button" className="pillButton outline">
                Zuordnen
              </button>
              <button
                type="button"
                className="pillButton primary"
                onClick={handleMachineSave}
                disabled={saving}
              >
                {saving ? "Speichern..." : "Speichern"}
              </button>
            </div>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <div className="welcomeCard">
          <h1>Gép betöltése…</h1>
        </div>
      ) : loadError || !machine ? (
        <div className="welcomeCard">
          <h1>Gép nem található</h1>
          <p>{loadError ?? "Ez a gép nem létezik az adatbázisban."}</p>
          <Link className="backButton" href="/maschinen">
            ← Vissza a listához
          </Link>
        </div>
      ) : (
        <div className="machineDetailBody">
            <header className="machineHero">
              <div className="machineHeroInfo">
                <span className="badge">Maschine</span>
                <h1>{formatValue(machine.geraetenummer)}</h1>
                {hasValue(machine.bezeichnung) ? (
                  <p className="machineHeroName">{formatValue(machine.bezeichnung)}</p>
                ) : null}
                {hasValue(machine.serial_number) ? (
                  <p className="machineHeroMeta">SN {formatValue(machine.serial_number)}</p>
                ) : null}
                {hasValue(machine.depot) ? (
                  <p className="machineHeroMeta">Depot {formatValue(machine.depot)}</p>
                ) : null}
              </div>

              <div className="machineHeroMedia">
                <div className="machineImagePanel">
                  <div className={`machineImageSlot ${machine.image ? "hasMachineImage" : ""}`}>
                    {machine.image ? (
                      <img className="machineImagePreview" src={machine.image} alt="Maschinenbild" />
                    ) : (
                      <span>Maschinenbild</span>
                    )}
                  </div>
                  {canUploadImages && isEditing ? (
                    <label className="pillButton outline machineImageUploadInline">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                      {uploadingImage ? "Wird hochgeladen..." : "Bild ändern"}
                    </label>
                  ) : null}
                </div>
                <div
                  className={`machineQrSlot ${machine.qr_code ? "hasQrImage machineQrLabeled" : ""}`}
                >
                  {machine.qr_code ? (
                    <img
                      className="machineQrImage"
                      src={machine.qr_code}
                      alt={`QR Code ${formatValue(machine.geraetenummer)}`}
                    />
                  ) : (
                    <div className="qrPlaceholder">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                  {!machine.qr_code ? <p>QR Code</p> : null}
                </div>
              </div>
              <div className="machineHeroActions">
                <Link className="backButton machineActionButton" href="/maschinen">
                  Zur Maschinenliste
                </Link>
                <label className="workStatusSelect machineActionButton">
                  <span>Arbeitsauftrag</span>
                  <select
                    defaultValue=""
                    aria-label="Arbeitsauftrag: Service, Check oder Reparatur"
                    onChange={(event) => {
                      const value = event.target.value;
                      if (
                        value === "Service" ||
                        value === "Check" ||
                        value === "Reparatur"
                      ) {
                        openArbeitsauftrag(value);
                        event.target.value = "";
                      }
                    }}
                  >
                    <option value="" disabled>
                      — wählen —
                    </option>
                    {ARBEITSAUFTRAG_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="pillButton outline machineActionButton"
                  onClick={() => {
                    if (!canWriteMachines) {
                      setSaveError("Keine Berechtigung: machines.write erforderlich.");
                      return;
                    }
                    setIsEditing((value) => !value);
                  }}
                  disabled={!canWriteMachines}
                  title={!canWriteMachines ? "Keine Berechtigung: machines.write erforderlich." : undefined}
                >
                  {isEditing ? "Bearbeitung beenden" : "Bearbeiten"}
                </button>
              </div>
            </header>
        <div className="tabSection">
          <div className="tabList">
            {tabs.map((tab) => (
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

          <div className={`tabPanel ${isEditing ? "" : "readOnlyPanel"}`}>
            <h2>{activeTab}</h2>
            {activeTab === "Stammdaten" ? (
              <>
                <div className="fieldGrid">
                  {visibleStammdatenForm.map((field) => {
                    const index = stammdatenForm.findIndex((item) => item.label === field.label);
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
                          disabled={!isEditing}
                          onChange={(e) =>
                            updateStammdatenField(index, e.target.value)
                          }
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
                          className={`statusSelect ${statusClassName(field.value)}`}
                          value={field.value}
                          disabled={!isEditing}
                          onChange={(e) =>
                            updateStammdatenField(index, e.target.value)
                          }
                        >
                          <option value="">Gerätstatus</option>
                          <option value="Fertig">Fertig</option>
                          <option value="In Reperatur">In Reperatur</option>
                        </select>
                      ) : field.dbKey ? (
                        <input
                          type={field.type === "date" ? "text" : field.type ?? "text"}
                          value={field.value}
                          readOnly={!isEditing}
                          onChange={(e) =>
                            updateStammdatenField(index, e.target.value)
                          }
                          placeholder={field.type === "date" ? "TT.MM.JJJJ" : field.label}
                        />
                      ) : (
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) =>
                            updateStammdatenField(index, e.target.value)
                          }
                          placeholder="—"
                          disabled
                        />
                      )}
                    </div>
                    );
                  })}
                </div>
                {saveError ? (
                  <p style={{ color: "#dc2626" }}>{saveError}</p>
                ) : null}
                <div className="actionGroup">
                  <button
                    className="pillButton primary"
                    type="button"
                    onClick={handleStammdatenSave}
                    disabled={saving || !isEditing}
                  >
                    {saving ? "Speichern…" : "Speichern"}
                  </button>
                  <Link className="pillButton outline" href="/maschinen">
                    Beenden
                  </Link>
                  <button className="pillButton outline" type="button">
                    Drucken
                  </button>
                </div>
              </>
            ) : activeTab === "Motor" ? (
              <div className="fieldGrid">
                <div className="fieldRow">
                  <span>Motor/Type:</span>
                  <input
                    type="text"
                    value={motorData.motorType}
                    onChange={(e) => setMotorData({ ...motorData, motorType: e.target.value })}
                    placeholder="Motor/Type"
                  />
                </div>
                <div className="fieldRow">
                  <span>Motornummer:</span>
                  <input
                    type="text"
                    value={motorData.motorNumber}
                    onChange={(e) => setMotorData({ ...motorData, motorNumber: e.target.value })}
                    placeholder="Motornummer"
                  />
                </div>
                <div className="fieldRow">
                  <span>Motorleistung:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={motorData.motorPower}
                      onChange={(e) => setMotorData({ ...motorData, motorPower: e.target.value })}
                      placeholder="kW"
                    />
                    <span>kW</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Ventilspiel Einlass:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={motorData.inletValveClearance}
                      onChange={(e) => setMotorData({ ...motorData, inletValveClearance: e.target.value })}
                      placeholder="mm"
                    />
                    <span>mm</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Ventilspiel Auslass:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={motorData.exhaustValveClearance}
                      onChange={(e) => setMotorData({ ...motorData, exhaustValveClearance: e.target.value })}
                      placeholder="mm"
                    />
                    <span>mm</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Motoröldruck:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={motorData.oilPressure}
                      onChange={(e) => setMotorData({ ...motorData, oilPressure: e.target.value })}
                      placeholder="Bar"
                    />
                    <span>Bar</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Motor Kühlsystem:</span>
                  <input
                    type="text"
                    value={motorData.coolingSystem}
                    onChange={(e) => setMotorData({ ...motorData, coolingSystem: e.target.value })}
                    placeholder="Kühlsystem"
                  />
                </div>
                <div className="fieldRow checkboxRow">
                  <span>Diesel Partikelfilter:</span>
                  <label className="checkboxLabel">
                    <input
                      type="checkbox"
                      checked={motorData.dieselParticulateFilter}
                      onChange={(e) => setMotorData({ ...motorData, dieselParticulateFilter: e.target.checked })}
                    />
                    Ja
                  </label>
                </div>
                <div className="fieldRow">
                  <span>Ad Blue:</span>
                  <select
                    value={motorData.adBlue}
                    onChange={(e) => setMotorData({ ...motorData, adBlue: e.target.value })}
                  >
                    <option value="">Bitte wählen..</option>
                    <option value="ja">Ja</option>
                    <option value="nein">Nein</option>
                  </select>
                </div>
                <div className="fieldRow">
                  <span>Euro-Abgasnorm:</span>
                  <input
                    type="text"
                    value={motorData.euroEmissionStandard}
                    onChange={(e) => setMotorData({ ...motorData, euroEmissionStandard: e.target.value })}
                    placeholder="Euro-Abgasnorm"
                  />
                </div>
                <div className="fieldRow">
                  <span>Abgas Emission:</span>
                  <input
                    type="text"
                    value={motorData.emission}
                    onChange={(e) => setMotorData({ ...motorData, emission: e.target.value })}
                    placeholder="Emission"
                  />
                </div>
                <div className="fieldRow">
                  <span>Abgasnachbehandlungssystem:</span>
                  <select
                    value={motorData.aftertreatmentSystem}
                    onChange={(e) => setMotorData({ ...motorData, aftertreatmentSystem: e.target.value })}
                  >
                    <option value="">Bitte wählen..</option>
                    <option value="dpfs">Dieselpartikelfilter</option>
                    <option value="scr">SCR</option>
                    <option value="ecat">EKAT</option>
                  </select>
                </div>
                <div className="fieldRow">
                  <span>Abgaszertifikat:</span>
                  <input
                    type="text"
                    value={motorData.certificate}
                    onChange={(e) => setMotorData({ ...motorData, certificate: e.target.value })}
                    placeholder="Abgaszertifikat"
                  />
                </div>
                <div className="fieldRow">
                  <span>Kraftstoffart & verbrauch:</span>
                  <input
                    type="text"
                    value={motorData.fuelTypeConsumption}
                    onChange={(e) => setMotorData({ ...motorData, fuelTypeConsumption: e.target.value })}
                    placeholder="Kraftstoffart & Verbrauch"
                  />
                </div>
                <div className="fieldRow">
                  <span>Motor Ersatzteilekatalog:</span>
                  <input
                    type="text"
                    value={motorData.partsCatalog}
                    onChange={(e) => setMotorData({ ...motorData, partsCatalog: e.target.value })}
                    placeholder="Ersatzteilekatalog"
                  />
                </div>
                <div className="fieldRow">
                  <span>Motor-Typenschild:</span>
                  <input
                    type="text"
                    value={motorData.typePlate}
                    onChange={(e) => setMotorData({ ...motorData, typePlate: e.target.value })}
                    placeholder="Typenschild"
                  />
                </div>
              </div>
            ) : activeTab === "Technische Daten" ? (
              <div className="fieldGrid">
                <div className="fieldRow">
                  <span>Eigengewicht:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={technicalData.operatingWeight}
                      onChange={(e) => setTechnicalData({ ...technicalData, operatingWeight: e.target.value })}
                      placeholder="kg"
                    />
                    <span>kg</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Gesamtbreite:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={technicalData.totalWidth}
                      onChange={(e) => setTechnicalData({ ...technicalData, totalWidth: e.target.value })}
                      placeholder="mm"
                    />
                    <span>mm</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Gesamthöhe:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={technicalData.totalHeight}
                      onChange={(e) => setTechnicalData({ ...technicalData, totalHeight: e.target.value })}
                      placeholder="mm"
                    />
                    <span>mm</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Gesamtlänge:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={technicalData.totalLength}
                      onChange={(e) => setTechnicalData({ ...technicalData, totalLength: e.target.value })}
                      placeholder="mm"
                    />
                    <span>mm</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Schaufelnutzlast:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={technicalData.bucketCapacity}
                      onChange={(e) => setTechnicalData({ ...technicalData, bucketCapacity: e.target.value })}
                      placeholder="kg/m³"
                    />
                    <span>kg/m³</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Reifendimension:</span>
                  <input
                    type="text"
                    value={technicalData.tireDimension}
                    onChange={(e) => setTechnicalData({ ...technicalData, tireDimension: e.target.value })}
                    placeholder="Reifendimension"
                  />
                </div>
                <div className="fieldRow">
                  <span>Reifendruck:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={technicalData.tirePressure}
                      onChange={(e) => setTechnicalData({ ...technicalData, tirePressure: e.target.value })}
                      placeholder="Bar"
                    />
                    <span>Bar</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Kettendimension:</span>
                  <input
                    type="text"
                    value={technicalData.chainDimension}
                    onChange={(e) => setTechnicalData({ ...technicalData, chainDimension: e.target.value })}
                    placeholder="Kettendimension"
                  />
                </div>
                <div className="fieldRow">
                  <span>Starter / Sn. Nummer:</span>
                  <input
                    type="text"
                    value={technicalData.starterNumber}
                    onChange={(e) => setTechnicalData({ ...technicalData, starterNumber: e.target.value })}
                    placeholder="Starter / Sn. Nummer"
                  />
                </div>
                <div className="fieldRow">
                  <span>Lichtmaschine / Leistung:</span>
                  <input
                    type="text"
                    value={technicalData.alternatorPower}
                    onChange={(e) => setTechnicalData({ ...technicalData, alternatorPower: e.target.value })}
                    placeholder="Lichtmaschine / Leistung"
                  />
                </div>
                <div className="fieldRow">
                  <span>Batterieleistung / Abmes.:</span>
                  <input
                    type="text"
                    value={technicalData.batteryPowerDimensions}
                    onChange={(e) => setTechnicalData({ ...technicalData, batteryPowerDimensions: e.target.value })}
                    placeholder="Batterieleistung / Abmes."
                  />
                </div>
                <div className="fieldRow">
                  <span>Generator / Sn. Nummer:</span>
                  <input
                    type="text"
                    value={technicalData.generatorNumber}
                    onChange={(e) => setTechnicalData({ ...technicalData, generatorNumber: e.target.value })}
                    placeholder="Generator / Sn. Nummer"
                  />
                </div>
                <div className="fieldRow">
                  <span>Generatorleistung:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={technicalData.generatorPower}
                      onChange={(e) => setTechnicalData({ ...technicalData, generatorPower: e.target.value })}
                      placeholder="kVA"
                    />
                    <span>kVA</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Controllertype:</span>
                  <input
                    type="text"
                    value={technicalData.controllerType}
                    onChange={(e) => setTechnicalData({ ...technicalData, controllerType: e.target.value })}
                    placeholder="Controller Type"
                  />
                </div>
                <div className="fieldRow">
                  <span>Software Version:</span>
                  <input
                    type="text"
                    value={technicalData.softwareVersion}
                    onChange={(e) => setTechnicalData({ ...technicalData, softwareVersion: e.target.value })}
                    placeholder="Software Version"
                  />
                </div>
                <div className="fieldRow">
                  <span>Betriebsdruck:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={technicalData.operatingPressure}
                      onChange={(e) => setTechnicalData({ ...technicalData, operatingPressure: e.target.value })}
                      placeholder="Bar"
                    />
                    <span>Bar</span>
                  </div>
                </div>
              </div>
            ) : activeTab === "Schmierstoffe" ? (
              <div className="fieldGrid">
                <div className="fieldRow">
                  <span>Motoröl / Füllmenge:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={lubricantData.engineOil}
                      onChange={(e) => setLubricantData({ ...lubricantData, engineOil: e.target.value })}
                      placeholder="Motoröl"
                    />
                    <span>Liter</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Getriebeöl / Füllmenge:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={lubricantData.gearboxOil}
                      onChange={(e) => setLubricantData({ ...lubricantData, gearboxOil: e.target.value })}
                      placeholder="Getriebeöl"
                    />
                    <span>Liter</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Kompressoröl / Füllmenge:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={lubricantData.compressorOil}
                      onChange={(e) => setLubricantData({ ...lubricantData, compressorOil: e.target.value })}
                      placeholder="Kompressoröl"
                    />
                    <span>Liter</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Hydrauliköl / Füllmenge:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={lubricantData.hydraulicOil}
                      onChange={(e) => setLubricantData({ ...lubricantData, hydraulicOil: e.target.value })}
                      placeholder="Hydrauliköl"
                    />
                    <span>Liter</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Achsenöl / Füllmenge:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={lubricantData.axleOil}
                      onChange={(e) => setLubricantData({ ...lubricantData, axleOil: e.target.value })}
                      placeholder="Achsenöl"
                    />
                    <span>Liter</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Differentialöl / Füllmenge:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={lubricantData.differentialOil}
                      onChange={(e) => setLubricantData({ ...lubricantData, differentialOil: e.target.value })}
                      placeholder="Differentialöl"
                    />
                    <span>Liter</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Endantriebsöl / Füllmenge:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={lubricantData.finalDriveOil}
                      onChange={(e) => setLubricantData({ ...lubricantData, finalDriveOil: e.target.value })}
                      placeholder="Endantriebsöl"
                    />
                    <span>Liter</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Kühlflüssigkeit / Füllmenge:</span>
                  <div className="inputWithUnit">
                    <input
                      type="text"
                      value={lubricantData.coolant}
                      onChange={(e) => setLubricantData({ ...lubricantData, coolant: e.target.value })}
                      placeholder="Kühlflüssigkeit"
                    />
                    <span>Liter</span>
                  </div>
                </div>
                <div className="fieldRow">
                  <span>Bremsflüssigkeit:</span>
                  <input
                    type="text"
                    value={lubricantData.brakeFluid}
                    onChange={(e) => setLubricantData({ ...lubricantData, brakeFluid: e.target.value })}
                    placeholder="Bremsflüssigkeit"
                  />
                </div>
              </div>
            ) : activeTab === "Anbaugeräte" ? (
              <div className="fieldGrid">
                <div className="fieldRow">
                  <span>HD-Hammer / Anschlüsse:</span>
                  <input
                    type="text"
                    value={attachmentData.hdHammer}
                    onChange={(e) => setAttachmentData({ ...attachmentData, hdHammer: e.target.value })}
                    placeholder="HD-Hammer / Anschlüsse"
                  />
                </div>
                <div className="fieldRow">
                  <span>Löffel Nr. / Anschlüsse:</span>
                  <input
                    type="text"
                    value={attachmentData.spoonNumber}
                    onChange={(e) => setAttachmentData({ ...attachmentData, spoonNumber: e.target.value })}
                    placeholder="Löffel Nr. / Anschlüsse"
                  />
                </div>
                <div className="fieldRow">
                  <span>Tieflöffel:</span>
                  <input
                    type="text"
                    value={attachmentData.deepBucket}
                    onChange={(e) => setAttachmentData({ ...attachmentData, deepBucket: e.target.value })}
                    placeholder="Tieflöffel"
                  />
                </div>
                <div className="fieldRow">
                  <span>Anbauplatte:</span>
                  <input
                    type="text"
                    value={attachmentData.mountingPlate}
                    onChange={(e) => setAttachmentData({ ...attachmentData, mountingPlate: e.target.value })}
                    placeholder="Anbauplatte"
                  />
                </div>
                <div className="fieldRow">
                  <span>Leichtgutschaufel:</span>
                  <input
                    type="text"
                    value={attachmentData.lightMaterialBucket}
                    onChange={(e) => setAttachmentData({ ...attachmentData, lightMaterialBucket: e.target.value })}
                    placeholder="Leichtgutschaufel"
                  />
                </div>
                <div className="fieldRow">
                  <span>Schnellwechsler / Type / Nr.:</span>
                  <input
                    type="text"
                    value={attachmentData.quickCouplerType}
                    onChange={(e) => setAttachmentData({ ...attachmentData, quickCouplerType: e.target.value })}
                    placeholder="Schnellwechsler / Type / Nr."
                  />
                </div>
                <div className="fieldRow">
                  <span>PowerTilt / Type / Nr.:</span>
                  <input
                    type="text"
                    value={attachmentData.powerTiltType}
                    onChange={(e) => setAttachmentData({ ...attachmentData, powerTiltType: e.target.value })}
                    placeholder="PowerTilt / Type / Nr."
                  />
                </div>
                <div className="fieldRow">
                  <span>SW-Ersatzteile Winkelbauer:</span>
                  <input
                    type="text"
                    value={attachmentData.replacementPartsWinkelbauer}
                    onChange={(e) => setAttachmentData({ ...attachmentData, replacementPartsWinkelbauer: e.target.value })}
                    placeholder="SW-Ersatzteile Winkelbauer"
                  />
                </div>
                <div className="fieldRow">
                  <span>Passende Anbaugeräte:</span>
                  <input
                    type="text"
                    value={attachmentData.matchingAttachments}
                    onChange={(e) => setAttachmentData({ ...attachmentData, matchingAttachments: e.target.value })}
                    placeholder="Passende Anbaugeräte"
                  />
                </div>
              </div>
            ) : activeTab === "Wartungstabelle" ? (
              <MaintenanceLagerParts
                parts={maintenanceData.parts}
                canEdit={canWriteMachines}
                onChange={(parts) => setMaintenanceData({ parts })}
              />
            ) : activeTab === "Dokumentation" ? (
              <div className="fieldGrid documentationGrid">
                {DOCUMENT_UPLOAD_ROWS.map((row) => (
                  <DocumentationDocumentRow
                    key={row.type}
                    label={row.label}
                    fileUrl={documentationData[row.urlKey]}
                    canUpload={canWriteMachines}
                    uploading={uploadingDocument === row.type}
                    onUpload={(event) => handleDocumentUpload(event, row.type)}
                  />
                ))}
              </div>
            ) : (
              <p>{tabContent[activeTab]}</p>
            )}
            {activeTab !== "Stammdaten" ? (
              <>
                {saveError ? (
                  <p style={{ color: "#dc2626" }}>{saveError}</p>
                ) : null}
                <div className="actionGroup">
                  <button
                    className="pillButton primary"
                    type="button"
                    onClick={handleMachineSave}
                    disabled={saving}
                  >
                    {saving ? "Speichern..." : "Speichern"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
        <section className="tabSection machineWorkOrdersSection">
          <div className="detailTopBar">
            <h2>Arbeitsaufträge</h2>
            <div className="detailTopActions">
              <Link
                className="pillButton outline"
                href={`/arbeitsauftrag?geraetenummer=${encodeURIComponent(machine.geraetenummer ?? "")}`}
              >
                Alle anzeigen
              </Link>
            </div>
          </div>

          {getWorkOrders(machine).length === 0 ? (
            <p className="scanHint">Noch keine Arbeitsaufträge für diese Maschine.</p>
          ) : (
            <div className="machineTableScroll">
              <table className="machineTable">
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Auftrag-Nr.</th>
                    <th>Art</th>
                    <th>Bearbeiter</th>
                    <th>Bemerkung</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {getWorkOrders(machine).map((order) => (
                    <tr key={order.id}>
                      <td>{order.date || "—"}</td>
                      <td>{formatWorkOrderNumber(order)}</td>
                      <td>{formatOrderType(order.type)}</td>
                      <td>{order.updatedBy || order.createdBy || "—"}</td>
                      <td>{order.notes?.trim() || order.repairDescription?.trim() || "—"}</td>
                      <td>
                        <div className="detailTopActions">
                          <Link
                            className="pillButton outline"
                            href={`/arbeitsauftrag?machineId=${encodeURIComponent(machine.id)}&auftragId=${encodeURIComponent(order.id)}`}
                          >
                            Öffnen
                          </Link>
                          <Link
                            className="pillButton outline"
                            href={`/arbeitsauftrag?machineId=${encodeURIComponent(machine.id)}&auftragId=${encodeURIComponent(order.id)}&print=1`}
                            target="_blank"
                          >
                            Drucken
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        </div>
      )}
    </AppPageShell>
  );
}

function PublicMachineView({
  machine,
  machineId,
  loading,
  loadError,
}: {
  machine: Machine | null;
  machineId: string;
  loading: boolean;
  loadError: string | null;
}) {
  const [reporter, setReporter] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<FileList | null>(null);
  const [sending, setSending] = useState(false);
  const [meldungStatus, setMeldungStatus] = useState<string | null>(null);
  const pruefprotokollUrl = getPublicDocumentUrl(machine, [
    "pruefprotokoll_url",
    "pruefprotokoll",
    "pruefbericht_url",
  ]);
  const betriebsanleitungUrl = getPublicDocumentUrl(machine, [
    "betriebsanleitung_url",
    "betriebsanleitung",
    "operatingManual",
  ]);

  async function submitMeldung(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMeldungStatus(null);

    const formData = new FormData();
    formData.append("reporter", reporter);
    formData.append("contact", contact);
    formData.append("message", message);
    Array.from(images ?? []).forEach((image) => formData.append("images", image));

    const response = await fetch(`/api/machines/${machineId}/meldung`, {
      method: "POST",
      body: formData,
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMeldungStatus(result.error ?? "Meldung konnte nicht gesendet werden.");
    } else {
      setReporter("");
      setContact("");
      setMessage("");
      setImages(null);
      const imageWarning = Array.isArray(result.imageErrors) && result.imageErrors.length
        ? ` Einige Bilder wurden nicht gespeichert: ${result.imageErrors.join(" ")}`
        : "";
      setMeldungStatus(`Meldung wurde gesendet. Danke.${imageWarning}`);
    }

    setSending(false);
  }

  if (loading) {
    return (
      <main className="publicMachinePage">
        <section className="publicMachineCard">
          <p className="scanHint">Maschinendaten werden geladen...</p>
        </section>
      </main>
    );
  }

  if (loadError || !machine) {
    return (
      <main className="publicMachinePage">
        <section className="publicMachineCard">
          <h1>Maschine nicht gefunden</h1>
          <p>{loadError ?? "Diese Maschine konnte nicht geladen werden."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="publicMachinePage">
      <section className="publicMachineCard">
        <span className="badge">Maschine</span>
        <div className="publicMachineHeader">
          {machine.image ? (
            <img
              className="publicMachineThumb"
              src={machine.image}
              alt={formatValue(machine.geraetenummer)}
            />
          ) : null}
          <div className="publicMachineHeaderText">
            <h1>{formatValue(machine.geraetenummer)}</h1>
            {hasValue(machine.bezeichnung) ? (
              <p className="subtitle">{machine.bezeichnung}</p>
            ) : null}
          </div>
        </div>

        <MachineStatusIndicators
          machine={machine as MachineRecord}
          className="publicMachineStatus"
        />

        <div className="publicMachineLinks">
          {pruefprotokollUrl ? (
            <a href={pruefprotokollUrl} target="_blank" rel="noreferrer">
              Prüfprotokoll öffnen
            </a>
          ) : (
            <p>Kein Prüfprotokoll hinterlegt.</p>
          )}
          {betriebsanleitungUrl ? (
            <a href={betriebsanleitungUrl} target="_blank" rel="noreferrer">
              Betriebsanleitung öffnen
            </a>
          ) : (
            <p>Keine Betriebsanleitung hinterlegt.</p>
          )}
        </div>

        <form className="publicMeldungForm" onSubmit={submitMeldung}>
          <h2>Meldung</h2>
          <label>
            <span>Name optional</span>
            <input value={reporter} onChange={(event) => setReporter(event.target.value)} />
          </label>
          <label>
            <span>Kontakt optional</span>
            <input value={contact} onChange={(event) => setContact(event.target.value)} />
          </label>
          <label>
            <span>Fehler beschreiben</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              required
            />
          </label>
          <label>
            <span>Bilder optional</span>
            <input
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
              multiple
              onChange={(event) => setImages(event.target.files)}
            />
            <small>Max. 4 Bilder, je 5 MB. JPG, PNG, WEBP, HEIC oder HEIF.</small>
          </label>
          <button className="pillButton primary" type="submit" disabled={sending}>
            {sending ? "Senden..." : "Meldung senden"}
          </button>
          {meldungStatus ? <p className="protocolNotice">{meldungStatus}</p> : null}
        </form>
      </section>
    </main>
  );
}

function getPublicDocumentUrl(machine: Machine | null, keys: string[]) {
  const tabData = machine?.machine_tab_data;
  if (!tabData || typeof tabData !== "object") return "";

  for (const key of keys) {
    const directValue = (tabData as Record<string, unknown>)[key];
    if (typeof directValue === "string" && directValue.trim()) return directValue.trim();
  }

  const documentation = (tabData as Record<string, unknown>).documentation;
  if (documentation && typeof documentation === "object" && !Array.isArray(documentation)) {
    for (const key of keys) {
      const value = (documentation as Record<string, unknown>)[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }

  return "";
}

function statusClassName(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "fertig") return "statusSelectFertig";
  if (normalized === "in reperatur" || normalized === "in reparatur") return "statusSelectRepair";
  return "";
}
