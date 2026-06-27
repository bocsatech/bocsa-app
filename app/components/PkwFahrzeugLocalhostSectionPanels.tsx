"use client";

import MachineDetailTabPanels from "./MachineDetailTabPanels";
import type { SessionAuthSlice } from "../../lib/machine-permissions";
import type { Machine } from "../../lib/types/machine";
import {
  DOCUMENT_UPLOAD_ROWS,
  INITIAL_DOCUMENTATION_DATA,
  type DocumentationFormData,
  type MotorFormData,
  type TechnicalFormData,
} from "../../lib/machine-tab-forms";
import type { MaintenanceLagerLink } from "../../lib/types/maintenance";
import MaintenanceLagerParts from "./MaintenanceLagerParts";
import type { PkwFahrzeugLocalhostSection } from "../../lib/pkw-fahrzeug-tabs";

const DUMMY_MACHINE = {
  id: "",
  created_at: "",
  depot: null,
  baujahr: null,
  geraetenummer: null,
  tpg_hebetechnik: null,
  elektro_ove: null,
  serial_number: null,
  subgroup: null,
} as Machine;

type Props = {
  section: PkwFahrzeugLocalhostSection;
  isEditing: boolean;
  canWrite: boolean;
  sessionAuth: SessionAuthSlice;
  motorData: MotorFormData;
  setMotorData: (data: MotorFormData) => void;
  technicalData: TechnicalFormData;
  setTechnicalData: (data: TechnicalFormData) => void;
  documentationData: DocumentationFormData;
  setDocumentationData: (data: DocumentationFormData) => void;
  ersatzteile: MaintenanceLagerLink[];
  setErsatzteile: (parts: MaintenanceLagerLink[]) => void;
  onLoadGruppenVorlage?: () => void;
  gruppenHref?: string;
};

function PkwDocumentationPanel({
  documentationData,
  setDocumentationData,
  isEditing,
}: {
  documentationData: DocumentationFormData;
  setDocumentationData: (data: DocumentationFormData) => void;
  isEditing: boolean;
}) {
  return (
    <div className="fieldGrid documentationGrid">
      {DOCUMENT_UPLOAD_ROWS.map((row) => {
        const value = documentationData[row.urlKey];
        return (
          <div key={row.urlKey} className="fieldRow documentationFieldRow">
            <span>{row.label}</span>
            <div className="documentationDocBody">
              {isEditing ? (
                <input
                  type="url"
                  value={value}
                  onChange={(event) =>
                    setDocumentationData({
                      ...documentationData,
                      [row.urlKey]: event.target.value,
                    })
                  }
                  placeholder="PDF-URL (optional)"
                />
              ) : value ? (
                <a
                  className="pillButton outline documentationDocLink"
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                >
                  Öffnen
                </a>
              ) : (
                <span className="documentEmptyHint">Kein Dokument hinterlegt.</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function createEmptyPkwDocumentationData(): DocumentationFormData {
  return { ...INITIAL_DOCUMENTATION_DATA };
}

export default function PkwFahrzeugLocalhostSectionPanels({
  section,
  isEditing,
  canWrite,
  sessionAuth,
  motorData,
  setMotorData,
  technicalData,
  setTechnicalData,
  documentationData,
  setDocumentationData,
  ersatzteile,
  setErsatzteile,
  onLoadGruppenVorlage,
  gruppenHref,
}: Props) {
  if (section === "Ersatzteile") {
    return (
      <>
        <div className="detailTopActions" style={{ marginBottom: 12 }}>
          {onLoadGruppenVorlage ? (
            <button type="button" className="pillButton outline" onClick={onLoadGruppenVorlage}>
              Gruppen-Vorlage laden
            </button>
          ) : null}
          {gruppenHref ? (
            <a className="pillButton outline" href={gruppenHref}>
              PKW-Gruppen bearbeiten
            </a>
          ) : null}
        </div>
        <MaintenanceLagerParts
          parts={ersatzteile}
          canEdit={isEditing}
          onChange={setErsatzteile}
          showGruppenActions={false}
        />
      </>
    );
  }

  if (section === "Dokumentation") {
    return (
      <PkwDocumentationPanel
        documentationData={documentationData}
        setDocumentationData={setDocumentationData}
        isEditing={isEditing && canWrite}
      />
    );
  }

  const machineTab = section === "Motor" ? "Motor" : "Technische Daten";

  return (
    <MachineDetailTabPanels
      activeTab={machineTab}
      isEditing={isEditing && canWrite}
      canWrite={canWrite}
      sessionAuth={sessionAuth}
      machine={DUMMY_MACHINE}
      stammdatenForm={[]}
      onUpdateStammdatenField={() => {}}
      motorData={motorData}
      setMotorData={setMotorData}
      technicalData={technicalData}
      setTechnicalData={setTechnicalData}
      lubricantData={{
        engineOil: "",
        gearboxOil: "",
        compressorOil: "",
        hydraulicOil: "",
        axleOil: "",
        differentialOil: "",
        finalDriveOil: "",
        coolant: "",
        brakeFluid: "",
      }}
      setLubricantData={() => {}}
      attachmentData={{
        hdHammer: "",
        spoonNumber: "",
        deepBucket: "",
        mountingPlate: "",
        lightMaterialBucket: "",
        quickCouplerType: "",
        powerTiltType: "",
        replacementPartsWinkelbauer: "",
        matchingAttachments: "",
      }}
      setAttachmentData={() => {}}
      maintenanceData={{ parts: [] }}
      setMaintenanceData={() => {}}
      documentationData={documentationData}
    />
  );
}
