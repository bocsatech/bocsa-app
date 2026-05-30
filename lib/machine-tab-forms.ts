import type { MaintenanceLagerLink } from "./types/maintenance";

export const MACHINE_DETAIL_TABS = [
  "Stammdaten",
  "Motor",
  "Technische Daten",
  "Schmierstoffe",
  "Anbaugeräte",
  "Wartungstabelle",
  "Dokumentation",
  "Zubehör",
] as const;

export type MachineDetailTab = (typeof MACHINE_DETAIL_TABS)[number];

export type MotorFormData = {
  motorType: string;
  motorNumber: string;
  motorPower: string;
  inletValveClearance: string;
  exhaustValveClearance: string;
  oilPressure: string;
  coolingSystem: string;
  dieselParticulateFilter: boolean;
  adBlue: string;
  euroEmissionStandard: string;
  emission: string;
  aftertreatmentSystem: string;
  certificate: string;
  fuelTypeConsumption: string;
  partsCatalog: string;
  typePlate: string;
};

export type TechnicalFormData = {
  operatingWeight: string;
  totalWidth: string;
  totalHeight: string;
  totalLength: string;
  bucketCapacity: string;
  tireDimension: string;
  tirePressure: string;
  chainDimension: string;
  starterNumber: string;
  alternatorPower: string;
  batteryPowerDimensions: string;
  generatorNumber: string;
  generatorPower: string;
  controllerType: string;
  softwareVersion: string;
  operatingPressure: string;
};

export type LubricantFormData = {
  engineOil: string;
  gearboxOil: string;
  compressorOil: string;
  hydraulicOil: string;
  axleOil: string;
  differentialOil: string;
  finalDriveOil: string;
  coolant: string;
  brakeFluid: string;
};

export type AttachmentFormData = {
  hdHammer: string;
  spoonNumber: string;
  deepBucket: string;
  mountingPlate: string;
  lightMaterialBucket: string;
  quickCouplerType: string;
  powerTiltType: string;
  replacementPartsWinkelbauer: string;
  matchingAttachments: string;
};

export type MaintenanceFormData = {
  parts: MaintenanceLagerLink[];
};

export type DocumentationFormData = {
  pruefprotokoll: string;
  operatingManual: string;
  sparePartsCatalog: string;
  wiringDiagram: string;
  hydraulicDiagram: string;
  technicalDatasheet: string;
};

export type MachineTabFormState = {
  note: string;
  motor: MotorFormData;
  technical: TechnicalFormData;
  lubricants: LubricantFormData;
  attachments: AttachmentFormData;
  maintenance: MaintenanceFormData;
  documentation: DocumentationFormData;
};

export const INITIAL_MOTOR_DATA: MotorFormData = {
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

export const INITIAL_TECHNICAL_DATA: TechnicalFormData = {
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

export const INITIAL_LUBRICANT_DATA: LubricantFormData = {
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

export const INITIAL_ATTACHMENT_DATA: AttachmentFormData = {
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

export const INITIAL_MAINTENANCE_DATA: MaintenanceFormData = {
  parts: [],
};

export const INITIAL_DOCUMENTATION_DATA: DocumentationFormData = {
  pruefprotokoll: "",
  operatingManual: "",
  sparePartsCatalog: "",
  wiringDiagram: "",
  hydraulicDiagram: "",
  technicalDatasheet: "",
};

export type MachineDocumentType =
  | "pruefprotokoll"
  | "betriebsanleitung"
  | "ersatzteilekatalog"
  | "stromlaufplan"
  | "hydraulikplan"
  | "technisches_datenblatt";

export const DOCUMENT_UPLOAD_ROWS: Array<{
  type: MachineDocumentType;
  label: string;
  urlKey: keyof DocumentationFormData;
}> = [
  { type: "pruefprotokoll", label: "Prüfprotokoll", urlKey: "pruefprotokoll" },
  { type: "betriebsanleitung", label: "Betriebsanleitung", urlKey: "operatingManual" },
  { type: "ersatzteilekatalog", label: "Ersatzteilekatalog", urlKey: "sparePartsCatalog" },
  { type: "stromlaufplan", label: "Stromlaufplan", urlKey: "wiringDiagram" },
  { type: "hydraulikplan", label: "Hydraulikplan", urlKey: "hydraulicDiagram" },
  { type: "technisches_datenblatt", label: "Techn. Datenblatt", urlKey: "technicalDatasheet" },
];

export const MACHINE_TAB_PLACEHOLDERS: Partial<Record<MachineDetailTab, string>> = {
  Zubehör: "Zubehör und Erweiterungen können nach dem Speichern gepflegt werden.",
};

export function createEmptyMachineTabForms(): MachineTabFormState {
  return {
    note: "",
    motor: { ...INITIAL_MOTOR_DATA },
    technical: { ...INITIAL_TECHNICAL_DATA },
    lubricants: { ...INITIAL_LUBRICANT_DATA },
    attachments: { ...INITIAL_ATTACHMENT_DATA },
    maintenance: { parts: [] },
    documentation: { ...INITIAL_DOCUMENTATION_DATA },
  };
}

export function objectFromTabData<T extends Record<string, unknown>>(
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

export function buildMachineTabDataPayload(forms: MachineTabFormState) {
  return {
    note: forms.note,
    motor: forms.motor,
    technical: forms.technical,
    lubricants: forms.lubricants,
    attachments: forms.attachments,
    maintenance: forms.maintenance,
    documentation: forms.documentation,
  };
}

export function loadMachineTabFormsFromMachine(
  tabData: Record<string, unknown> | null | undefined
): MachineTabFormState {
  const maintenance = objectFromTabData(tabData, "maintenance", INITIAL_MAINTENANCE_DATA);
  const documentation = objectFromTabData(tabData, "documentation", INITIAL_DOCUMENTATION_DATA);

  return {
    note: typeof tabData?.note === "string" ? tabData.note : "",
    motor: objectFromTabData(tabData, "motor", INITIAL_MOTOR_DATA),
    technical: objectFromTabData(tabData, "technical", INITIAL_TECHNICAL_DATA),
    lubricants: objectFromTabData(tabData, "lubricants", INITIAL_LUBRICANT_DATA),
    attachments: objectFromTabData(tabData, "attachments", INITIAL_ATTACHMENT_DATA),
    maintenance: {
      parts: Array.isArray(maintenance.parts) ? maintenance.parts : [],
    },
    documentation: {
      ...documentation,
      pruefprotokoll:
        typeof documentation.pruefprotokoll === "string" ? documentation.pruefprotokoll : "",
      operatingManual:
        typeof documentation.operatingManual === "string" ? documentation.operatingManual : "",
    },
  };
}
