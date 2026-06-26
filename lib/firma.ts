export const FIRMA_SETTINGS_KEY = "firma";

export type FirmaData = {
  name: string;
  contactName: string;
  contactPhone: string;
  email: string;
  website: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  taxNumber: string;
  companyRegisterNumber: string;
  bankName: string;
  iban: string;
  bic: string;
  notes: string;
};

export const EMPTY_FIRMA: FirmaData = {
  name: "",
  contactName: "",
  contactPhone: "",
  email: "",
  website: "",
  street: "",
  postalCode: "",
  city: "",
  country: "Österreich",
  taxNumber: "",
  companyRegisterNumber: "",
  bankName: "",
  iban: "",
  bic: "",
  notes: "",
};

function optionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeFirmaData(value: unknown): FirmaData {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    name: optionalText(raw.name),
    contactName: optionalText(raw.contactName ?? raw.contact_name),
    contactPhone: optionalText(raw.contactPhone ?? raw.contact_phone),
    email: optionalText(raw.email),
    website: optionalText(raw.website),
    street: optionalText(raw.street),
    postalCode: optionalText(raw.postalCode ?? raw.postal_code),
    city: optionalText(raw.city),
    country: optionalText(raw.country) || "Österreich",
    taxNumber: optionalText(raw.taxNumber ?? raw.tax_number),
    companyRegisterNumber: optionalText(
      raw.companyRegisterNumber ?? raw.company_register_number
    ),
    bankName: optionalText(raw.bankName ?? raw.bank_name),
    iban: optionalText(raw.iban),
    bic: optionalText(raw.bic),
    notes: optionalText(raw.notes),
  };
}
