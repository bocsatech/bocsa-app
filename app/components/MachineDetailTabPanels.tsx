"use client";

import type { ChangeEvent, ReactNode } from "react";
import DocumentationDocumentRow from "./DocumentationDocumentRow";
import MaintenanceLagerParts from "./MaintenanceLagerParts";
import MachineStammdatenPanelContent from "./MachineStammdatenPanelContent";
import type { GeraetenummerCodesConfig, GeraetenummerPick } from "../../lib/geraetenummer";
import type { StammdatenField } from "../../lib/machines";
import type { Machine } from "../../lib/types/machine";
import {
  DOCUMENT_UPLOAD_ROWS,
  MACHINE_TAB_PLACEHOLDERS,
  type AttachmentFormData,
  type DocumentationFormData,
  type LubricantFormData,
  type MachineDetailTab,
  type MachineDocumentType,
  type MaintenanceFormData,
  type MotorFormData,
  type TechnicalFormData,
} from "../../lib/machine-tab-forms";

type Props = {
  activeTab: MachineDetailTab;
  isEditing: boolean;
  canWrite: boolean;
  machine: Machine;
  stammdatenForm: StammdatenField[];
  onUpdateStammdatenField: (index: number, value: string) => void;
  saveError?: string | null;
  showQrCode?: boolean;
  mediaFooter?: ReactNode;
  useStructuredGeraetenummer?: boolean;
  geraetenummerCodes?: GeraetenummerCodesConfig | null;
  geraetenummerPick?: GeraetenummerPick;
  onGeraetenummerPickChange?: (pick: GeraetenummerPick) => void;
  geraetenummerPreviewSequence?: number | null;
  geraetenummerPreviewLoading?: boolean;
  motorData: MotorFormData;
  setMotorData: (data: MotorFormData) => void;
  technicalData: TechnicalFormData;
  setTechnicalData: (data: TechnicalFormData) => void;
  lubricantData: LubricantFormData;
  setLubricantData: (data: LubricantFormData) => void;
  attachmentData: AttachmentFormData;
  setAttachmentData: (data: AttachmentFormData) => void;
  maintenanceData: MaintenanceFormData;
  setMaintenanceData: (data: MaintenanceFormData) => void;
  documentationData: DocumentationFormData;
  canUploadDocuments?: boolean;
  uploadingDocument?: MachineDocumentType | null;
  onDocumentUpload?: (
    event: ChangeEvent<HTMLInputElement>,
    type: MachineDocumentType
  ) => void;
};

export default function MachineDetailTabPanels({
  activeTab,
  isEditing,
  canWrite,
  machine,
  stammdatenForm,
  onUpdateStammdatenField,
  saveError,
  showQrCode,
  mediaFooter,
  useStructuredGeraetenummer,
  geraetenummerCodes,
  geraetenummerPick,
  onGeraetenummerPickChange,
  geraetenummerPreviewSequence,
  geraetenummerPreviewLoading,
  motorData,
  setMotorData,
  technicalData,
  setTechnicalData,
  lubricantData,
  setLubricantData,
  attachmentData,
  setAttachmentData,
  maintenanceData,
  setMaintenanceData,
  documentationData,
  canUploadDocuments,
  uploadingDocument,
  onDocumentUpload,
}: Props) {
  return (
    <>
      {activeTab !== "Stammdaten" ? <h2>{activeTab}</h2> : null}
      {activeTab === "Stammdaten" ? (
        <MachineStammdatenPanelContent
          machine={machine}
          stammdatenForm={stammdatenForm}
          isEditing={isEditing}
          canWrite={canWrite}
          onUpdateField={onUpdateStammdatenField}
          saveError={saveError}
          showQrCode={showQrCode}
          mediaFooter={mediaFooter}
          useStructuredGeraetenummer={useStructuredGeraetenummer}
          geraetenummerCodes={geraetenummerCodes}
          geraetenummerPick={geraetenummerPick}
          onGeraetenummerPickChange={onGeraetenummerPickChange}
          geraetenummerPreviewSequence={geraetenummerPreviewSequence}
          geraetenummerPreviewLoading={geraetenummerPreviewLoading}
        />
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
                onChange={(e) =>
                  setMotorData({ ...motorData, inletValveClearance: e.target.value })
                }
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
                onChange={(e) =>
                  setMotorData({ ...motorData, exhaustValveClearance: e.target.value })
                }
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
                onChange={(e) =>
                  setMotorData({ ...motorData, dieselParticulateFilter: e.target.checked })
                }
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
              onChange={(e) =>
                setMotorData({ ...motorData, euroEmissionStandard: e.target.value })
              }
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
              onChange={(e) =>
                setMotorData({ ...motorData, aftertreatmentSystem: e.target.value })
              }
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
              onChange={(e) =>
                setMotorData({ ...motorData, fuelTypeConsumption: e.target.value })
              }
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
                onChange={(e) =>
                  setTechnicalData({ ...technicalData, operatingWeight: e.target.value })
                }
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
                onChange={(e) =>
                  setTechnicalData({ ...technicalData, totalWidth: e.target.value })
                }
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
                onChange={(e) =>
                  setTechnicalData({ ...technicalData, totalHeight: e.target.value })
                }
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
                onChange={(e) =>
                  setTechnicalData({ ...technicalData, totalLength: e.target.value })
                }
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
                onChange={(e) =>
                  setTechnicalData({ ...technicalData, bucketCapacity: e.target.value })
                }
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
              onChange={(e) =>
                setTechnicalData({ ...technicalData, tireDimension: e.target.value })
              }
              placeholder="Reifendimension"
            />
          </div>
          <div className="fieldRow">
            <span>Reifendruck:</span>
            <div className="inputWithUnit">
              <input
                type="text"
                value={technicalData.tirePressure}
                onChange={(e) =>
                  setTechnicalData({ ...technicalData, tirePressure: e.target.value })
                }
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
              onChange={(e) =>
                setTechnicalData({ ...technicalData, chainDimension: e.target.value })
              }
              placeholder="Kettendimension"
            />
          </div>
          <div className="fieldRow">
            <span>Starter / Sn. Nummer:</span>
            <input
              type="text"
              value={technicalData.starterNumber}
              onChange={(e) =>
                setTechnicalData({ ...technicalData, starterNumber: e.target.value })
              }
              placeholder="Starter / Sn. Nummer"
            />
          </div>
          <div className="fieldRow">
            <span>Lichtmaschine / Leistung:</span>
            <input
              type="text"
              value={technicalData.alternatorPower}
              onChange={(e) =>
                setTechnicalData({ ...technicalData, alternatorPower: e.target.value })
              }
              placeholder="Lichtmaschine / Leistung"
            />
          </div>
          <div className="fieldRow">
            <span>Batterieleistung / Abmes.:</span>
            <input
              type="text"
              value={technicalData.batteryPowerDimensions}
              onChange={(e) =>
                setTechnicalData({
                  ...technicalData,
                  batteryPowerDimensions: e.target.value,
                })
              }
              placeholder="Batterieleistung / Abmes."
            />
          </div>
          <div className="fieldRow">
            <span>Generator / Sn. Nummer:</span>
            <input
              type="text"
              value={technicalData.generatorNumber}
              onChange={(e) =>
                setTechnicalData({ ...technicalData, generatorNumber: e.target.value })
              }
              placeholder="Generator / Sn. Nummer"
            />
          </div>
          <div className="fieldRow">
            <span>Generatorleistung:</span>
            <div className="inputWithUnit">
              <input
                type="text"
                value={technicalData.generatorPower}
                onChange={(e) =>
                  setTechnicalData({ ...technicalData, generatorPower: e.target.value })
                }
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
              onChange={(e) =>
                setTechnicalData({ ...technicalData, controllerType: e.target.value })
              }
              placeholder="Controller Type"
            />
          </div>
          <div className="fieldRow">
            <span>Software Version:</span>
            <input
              type="text"
              value={technicalData.softwareVersion}
              onChange={(e) =>
                setTechnicalData({ ...technicalData, softwareVersion: e.target.value })
              }
              placeholder="Software Version"
            />
          </div>
          <div className="fieldRow">
            <span>Betriebsdruck:</span>
            <div className="inputWithUnit">
              <input
                type="text"
                value={technicalData.operatingPressure}
                onChange={(e) =>
                  setTechnicalData({ ...technicalData, operatingPressure: e.target.value })
                }
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
                onChange={(e) =>
                  setLubricantData({ ...lubricantData, gearboxOil: e.target.value })
                }
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
                onChange={(e) =>
                  setLubricantData({ ...lubricantData, compressorOil: e.target.value })
                }
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
                onChange={(e) =>
                  setLubricantData({ ...lubricantData, hydraulicOil: e.target.value })
                }
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
                onChange={(e) =>
                  setLubricantData({ ...lubricantData, differentialOil: e.target.value })
                }
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
                onChange={(e) =>
                  setLubricantData({ ...lubricantData, finalDriveOil: e.target.value })
                }
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
              onChange={(e) =>
                setLubricantData({ ...lubricantData, brakeFluid: e.target.value })
              }
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
              onChange={(e) =>
                setAttachmentData({ ...attachmentData, spoonNumber: e.target.value })
              }
              placeholder="Löffel Nr. / Anschlüsse"
            />
          </div>
          <div className="fieldRow">
            <span>Tieflöffel:</span>
            <input
              type="text"
              value={attachmentData.deepBucket}
              onChange={(e) =>
                setAttachmentData({ ...attachmentData, deepBucket: e.target.value })
              }
              placeholder="Tieflöffel"
            />
          </div>
          <div className="fieldRow">
            <span>Anbauplatte:</span>
            <input
              type="text"
              value={attachmentData.mountingPlate}
              onChange={(e) =>
                setAttachmentData({ ...attachmentData, mountingPlate: e.target.value })
              }
              placeholder="Anbauplatte"
            />
          </div>
          <div className="fieldRow">
            <span>Leichtgutschaufel:</span>
            <input
              type="text"
              value={attachmentData.lightMaterialBucket}
              onChange={(e) =>
                setAttachmentData({ ...attachmentData, lightMaterialBucket: e.target.value })
              }
              placeholder="Leichtgutschaufel"
            />
          </div>
          <div className="fieldRow">
            <span>Schnellwechsler / Type / Nr.:</span>
            <input
              type="text"
              value={attachmentData.quickCouplerType}
              onChange={(e) =>
                setAttachmentData({ ...attachmentData, quickCouplerType: e.target.value })
              }
              placeholder="Schnellwechsler / Type / Nr."
            />
          </div>
          <div className="fieldRow">
            <span>PowerTilt / Type / Nr.:</span>
            <input
              type="text"
              value={attachmentData.powerTiltType}
              onChange={(e) =>
                setAttachmentData({ ...attachmentData, powerTiltType: e.target.value })
              }
              placeholder="PowerTilt / Type / Nr."
            />
          </div>
          <div className="fieldRow">
            <span>SW-Ersatzteile Winkelbauer:</span>
            <input
              type="text"
              value={attachmentData.replacementPartsWinkelbauer}
              onChange={(e) =>
                setAttachmentData({
                  ...attachmentData,
                  replacementPartsWinkelbauer: e.target.value,
                })
              }
              placeholder="SW-Ersatzteile Winkelbauer"
            />
          </div>
          <div className="fieldRow">
            <span>Passende Anbaugeräte:</span>
            <input
              type="text"
              value={attachmentData.matchingAttachments}
              onChange={(e) =>
                setAttachmentData({ ...attachmentData, matchingAttachments: e.target.value })
              }
              placeholder="Passende Anbaugeräte"
            />
          </div>
        </div>
      ) : activeTab === "Wartungstabelle" ? (
        <MaintenanceLagerParts
          parts={maintenanceData.parts}
          canEdit={canWrite && isEditing}
          onChange={(parts) => setMaintenanceData({ parts })}
          subgroup={machine.subgroup}
        />
      ) : activeTab === "Dokumentation" ? (
        <>
          {!canUploadDocuments ? (
            <p className="documentEmptyHint">
              PDF-Upload nach dem Speichern der Maschine möglich.
            </p>
          ) : null}
          <div className="fieldGrid documentationGrid">
            {DOCUMENT_UPLOAD_ROWS.map((row) => (
              <DocumentationDocumentRow
                key={row.type}
                label={row.label}
                fileUrl={documentationData[row.urlKey]}
                isEditing={isEditing}
                canWrite={canUploadDocuments ?? false}
                uploading={uploadingDocument === row.type}
                onUpload={(event) => onDocumentUpload?.(event, row.type)}
              />
            ))}
          </div>
        </>
      ) : activeTab === "Zubehör" ? (
        <p>{MACHINE_TAB_PLACEHOLDERS.Zubehör}</p>
      ) : (
        <p>{MACHINE_TAB_PLACEHOLDERS[activeTab] ?? "—"}</p>
      )}
    </>
  );
}
