import type { LubricantFormData, MotorFormData, TechnicalFormData } from "./machine-tab-forms";

export type TabFieldDef<T extends Record<string, unknown>> = {
  key: keyof T & string;
  label: string;
  type?: "text" | "checkbox" | "select";
  options?: string[];
  unit?: string;
};

export const MOTOR_TAB_FIELDS: TabFieldDef<MotorFormData>[] = [
  { key: "motorType", label: "Motor/Type" },
  { key: "motorNumber", label: "Motornummer" },
  { key: "motorPower", label: "Motorleistung", unit: "kW" },
  { key: "inletValveClearance", label: "Ventilspiel Einlass", unit: "mm" },
  { key: "exhaustValveClearance", label: "Ventilspiel Auslass", unit: "mm" },
  { key: "oilPressure", label: "Motoröldruck", unit: "Bar" },
  { key: "coolingSystem", label: "Motor Kühlsystem" },
  { key: "dieselParticulateFilter", label: "Diesel Partikelfilter", type: "checkbox" },
  { key: "adBlue", label: "Ad Blue", type: "select", options: ["", "ja", "nein"] },
  { key: "euroEmissionStandard", label: "Euro-Abgasnorm" },
  { key: "emission", label: "Abgas Emission" },
  {
    key: "aftertreatmentSystem",
    label: "Abgasnachbehandlungssystem",
    type: "select",
    options: ["", "dpfs", "scr", "ecat"],
  },
  { key: "certificate", label: "Abgaszertifikat" },
  { key: "fuelTypeConsumption", label: "Kraftstoffart & Verbrauch" },
  { key: "partsCatalog", label: "Motor Ersatzteilekatalog" },
  { key: "typePlate", label: "Motor-Typenschild" },
];

export const TECHNICAL_TAB_FIELDS: TabFieldDef<TechnicalFormData>[] = [
  { key: "operatingWeight", label: "Eigengewicht", unit: "kg" },
  { key: "totalWidth", label: "Gesamtbreite", unit: "mm" },
  { key: "totalHeight", label: "Gesamthöhe", unit: "mm" },
  { key: "totalLength", label: "Gesamtlänge", unit: "mm" },
  { key: "bucketCapacity", label: "Löffelinhalt", unit: "m³" },
  { key: "tireDimension", label: "Reifengröße" },
  { key: "tirePressure", label: "Reifendruck", unit: "Bar" },
  { key: "chainDimension", label: "Kettendimension" },
  { key: "starterNumber", label: "Starter Nr." },
  { key: "alternatorPower", label: "Lichtmaschine", unit: "A" },
  { key: "batteryPowerDimensions", label: "Batterie" },
  { key: "generatorNumber", label: "Generator Nr." },
  { key: "generatorPower", label: "Generatorleistung", unit: "kW" },
  { key: "controllerType", label: "Steuergerät" },
  { key: "softwareVersion", label: "Softwareversion" },
  { key: "operatingPressure", label: "Betriebsdruck", unit: "Bar" },
];

export const LUBRICANT_TAB_FIELDS: TabFieldDef<LubricantFormData>[] = [
  { key: "engineOil", label: "Motoröl" },
  { key: "gearboxOil", label: "Getriebeöl" },
  { key: "compressorOil", label: "Kompressoröl" },
  { key: "hydraulicOil", label: "Hydrauliköl" },
  { key: "axleOil", label: "Achsöl" },
  { key: "differentialOil", label: "Differentialöl" },
  { key: "finalDriveOil", label: "Antriebsöl" },
  { key: "coolant", label: "Kühlflüssigkeit" },
  { key: "brakeFluid", label: "Bremsflüssigkeit" },
];
