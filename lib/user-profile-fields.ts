import { normalizeGermanDate } from "./dates";
import { normalizeUserFilialeCode, type UserFilialeCode } from "./user-filiale";
import { normalizeUserWorkArea, type UserWorkArea } from "./user-stammdaten";

export const PERSONAL_PROFILES_TABLE = "user_personal_profiles";

export type UserProfileFields = {
  full_name: string | null;
  position: string | null;
  site: string | null;
  filiale_code: UserFilialeCode | null;
  photo_url: string | null;
  signature_url: string | null;
  company_mobile: string | null;
  private_mobile: string | null;
  company_email: string | null;
  private_email: string | null;
  birth_date: string | null;
  address: string | null;
  ecard_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  bank_account: string | null;
  direct_manager: string | null;
  work_area: UserWorkArea | null;
};

export const USER_PROFILE_SELECT =
  "full_name, position, site, filiale_code, photo_url, signature_url, company_mobile, private_mobile, company_email, private_email, birth_date, address, ecard_number, emergency_contact_name, emergency_contact_phone, bank_account, direct_manager, work_area";

export type UserProfilePatch = Partial<{
  fullName: string;
  position: string;
  site: string;
  filialeCode: UserFilialeCode | null;
  photoUrl: string;
  signatureUrl: string;
  companyMobile: string | null;
  privateMobile: string | null;
  companyEmail: string | null;
  privateEmail: string | null;
  birthDate: string | null;
  address: string | null;
  ecardNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bankAccount: string | null;
  directManager: string | null;
  workArea: UserWorkArea | null;
}>;

export function emptyProfileFields(): UserProfileFields {
  return {
    full_name: null,
    position: null,
    site: null,
    filiale_code: null,
    photo_url: null,
    signature_url: null,
    company_mobile: null,
    private_mobile: null,
    company_email: null,
    private_email: null,
    birth_date: null,
    address: null,
    ecard_number: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    bank_account: null,
    direct_manager: null,
    work_area: null,
  };
}

export function profileFieldsFromRow(row: Record<string, unknown> | null | undefined): UserProfileFields {
  if (!row) return emptyProfileFields();
  return {
    full_name: typeof row.full_name === "string" ? row.full_name : null,
    position: typeof row.position === "string" ? row.position : null,
    site: typeof row.site === "string" ? row.site : null,
    filiale_code:
      row.filiale_code === "S" || row.filiale_code === "H" || row.filiale_code === "W"
        ? row.filiale_code
        : null,
    photo_url: typeof row.photo_url === "string" ? row.photo_url : null,
    signature_url: typeof row.signature_url === "string" ? row.signature_url : null,
    company_mobile: typeof row.company_mobile === "string" ? row.company_mobile : null,
    private_mobile: typeof row.private_mobile === "string" ? row.private_mobile : null,
    company_email: typeof row.company_email === "string" ? row.company_email : null,
    private_email: typeof row.private_email === "string" ? row.private_email : null,
    birth_date: typeof row.birth_date === "string" ? row.birth_date : null,
    address: typeof row.address === "string" ? row.address : null,
    ecard_number: typeof row.ecard_number === "string" ? row.ecard_number : null,
    emergency_contact_name:
      typeof row.emergency_contact_name === "string" ? row.emergency_contact_name : null,
    emergency_contact_phone:
      typeof row.emergency_contact_phone === "string" ? row.emergency_contact_phone : null,
    bank_account: typeof row.bank_account === "string" ? row.bank_account : null,
    direct_manager: typeof row.direct_manager === "string" ? row.direct_manager : null,
    work_area:
      row.work_area === "lager" || row.work_area === "werkstatt" ? row.work_area : null,
  };
}

function optionalText(value: unknown) {
  if (value === undefined) return undefined;
  const text = String(value ?? "").trim();
  return text || null;
}

export function userProfilePatchToDbPayload(patch: UserProfilePatch) {
  const payload: Record<string, unknown> = {};

  if (patch.fullName !== undefined) payload.full_name = patch.fullName.trim() || null;
  if (patch.position !== undefined) payload.position = patch.position.trim() || null;
  if (patch.site !== undefined) payload.site = patch.site.trim() || null;
  if (patch.filialeCode !== undefined) {
    payload.filiale_code =
      patch.filialeCode === null ? null : normalizeUserFilialeCode(patch.filialeCode);
  }
  if (patch.photoUrl !== undefined) payload.photo_url = patch.photoUrl.trim() || null;
  if (patch.signatureUrl !== undefined) payload.signature_url = patch.signatureUrl.trim() || null;
  if (patch.companyMobile !== undefined) payload.company_mobile = optionalText(patch.companyMobile);
  if (patch.privateMobile !== undefined) payload.private_mobile = optionalText(patch.privateMobile);
  if (patch.companyEmail !== undefined) payload.company_email = optionalText(patch.companyEmail);
  if (patch.privateEmail !== undefined) payload.private_email = optionalText(patch.privateEmail);
  if (patch.birthDate !== undefined) payload.birth_date = optionalText(patch.birthDate);
  if (patch.address !== undefined) payload.address = optionalText(patch.address);
  if (patch.ecardNumber !== undefined) payload.ecard_number = optionalText(patch.ecardNumber);
  if (patch.emergencyContactName !== undefined) {
    payload.emergency_contact_name = optionalText(patch.emergencyContactName);
  }
  if (patch.emergencyContactPhone !== undefined) {
    payload.emergency_contact_phone = optionalText(patch.emergencyContactPhone);
  }
  if (patch.bankAccount !== undefined) payload.bank_account = optionalText(patch.bankAccount);
  if (patch.directManager !== undefined) payload.direct_manager = optionalText(patch.directManager);
  if (patch.workArea !== undefined) {
    payload.work_area =
      patch.workArea === null || patch.workArea === ""
        ? null
        : normalizeUserWorkArea(patch.workArea);
  }

  return payload;
}

export function validateAndNormalizeProfilePatch(patch: UserProfilePatch): {
  patch: UserProfilePatch;
  error: string | null;
} {
  const next: UserProfilePatch = { ...patch };

  if (next.filialeCode !== undefined) {
    if (next.filialeCode === null || next.filialeCode === "") {
      next.filialeCode = null;
    } else {
      const code = normalizeUserFilialeCode(next.filialeCode);
      if (!code) {
        return {
          patch: next,
          error: "Ungültige Filiale. Erlaubt: S (Schwechat), H (Horn), W (Wien).",
        };
      }
      next.filialeCode = code;
    }
  }

  if (next.birthDate !== undefined) {
    if (next.birthDate === null || String(next.birthDate).trim() === "") {
      next.birthDate = null;
    } else {
      const normalized = normalizeGermanDate(next.birthDate);
      if (!normalized) {
        return {
          patch: next,
          error: "Geburtstag muss im Format TT.MM.JJJJ sein.",
        };
      }
      next.birthDate = normalized;
    }
  }

  if (next.workArea !== undefined) {
    if (next.workArea === null || next.workArea === "") {
      next.workArea = null;
    } else {
      const area = normalizeUserWorkArea(next.workArea);
      if (!area) {
        return {
          patch: next,
          error: "Ungültiger Arbeitsbereich. Erlaubt: Lager, Werkstatt.",
        };
      }
      next.workArea = area;
    }
  }

  return { patch: next, error: null };
}

export function parseUserProfilePatchFromBody(body: Record<string, unknown>): UserProfilePatch {
  return {
    fullName: body.fullName !== undefined ? String(body.fullName ?? "") : undefined,
    position: body.position !== undefined ? String(body.position ?? "") : undefined,
    site: body.site !== undefined ? String(body.site ?? "") : undefined,
    filialeCode:
      body.filialeCode !== undefined || body.filiale_code !== undefined
        ? ((body.filialeCode ?? body.filiale_code) as UserFilialeCode | null | "")
        : undefined,
    photoUrl: body.photoUrl !== undefined ? String(body.photoUrl ?? "") : undefined,
    signatureUrl:
      body.signatureUrl !== undefined ? String(body.signatureUrl ?? "") : undefined,
    companyMobile:
      body.companyMobile !== undefined
        ? optionalText(body.companyMobile ?? body.company_mobile)
        : undefined,
    privateMobile:
      body.privateMobile !== undefined
        ? optionalText(body.privateMobile ?? body.private_mobile)
        : undefined,
    companyEmail:
      body.companyEmail !== undefined
        ? optionalText(body.companyEmail ?? body.company_email)
        : undefined,
    privateEmail:
      body.privateEmail !== undefined
        ? optionalText(body.privateEmail ?? body.private_email)
        : undefined,
    birthDate:
      body.birthDate !== undefined
        ? optionalText(body.birthDate ?? body.birth_date)
        : undefined,
    address: body.address !== undefined ? optionalText(body.address) : undefined,
    ecardNumber:
      body.ecardNumber !== undefined
        ? optionalText(body.ecardNumber ?? body.ecard_number)
        : undefined,
    emergencyContactName:
      body.emergencyContactName !== undefined
        ? optionalText(body.emergencyContactName ?? body.emergency_contact_name)
        : undefined,
    emergencyContactPhone:
      body.emergencyContactPhone !== undefined
        ? optionalText(body.emergencyContactPhone ?? body.emergency_contact_phone)
        : undefined,
    bankAccount:
      body.bankAccount !== undefined
        ? optionalText(body.bankAccount ?? body.bank_account)
        : undefined,
    directManager:
      body.directManager !== undefined
        ? optionalText(body.directManager ?? body.direct_manager)
        : undefined,
    workArea:
      body.workArea !== undefined || body.work_area !== undefined
        ? ((body.workArea ?? body.work_area) as UserWorkArea | null | "")
        : undefined,
  };
}
