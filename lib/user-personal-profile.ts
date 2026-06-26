import { getSupabaseAdmin } from "./supabaseAdmin";
import {
  PERSONAL_PROFILES_TABLE,
  USER_PROFILE_SELECT,
  emptyProfileFields,
  profileFieldsFromRow,
  userProfilePatchToDbPayload,
  type UserProfileFields,
  type UserProfilePatch,
} from "./user-profile-fields";
import { normalizeUserWorkArea } from "./user-stammdaten";

function getDb() {
  return getSupabaseAdmin();
}

function isMissingProfileColumn(error: unknown, columns: string[]) {
  if (!error || typeof error !== "object") return false;
  const msg = String((error as { message?: unknown }).message ?? "").toLowerCase();
  if (!columns.some((column) => msg.includes(column))) return false;
  return msg.includes("does not exist") || msg.includes("schema cache");
}

const USER_PROFILE_SELECT_NO_STAMMDATEN =
  "full_name, position, site, filiale_code, photo_url, signature_url, company_mobile, private_mobile, company_email, private_email, birth_date, address, ecard_number, emergency_contact_name, emergency_contact_phone";

export function isMissingPersonalProfilesTable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = String((error as { code?: string }).code ?? "");
  const message = String((error as { message?: unknown }).message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("user_personal_profiles")
  );
}

export async function loadPersonalProfile(userId: string) {
  const db = getDb();
  if (!db) {
    return {
      profile: emptyProfileFields(),
      error: null,
      missingTable: true,
      missingRow: false,
    };
  }

  let { data, error } = await db
    .from(PERSONAL_PROFILES_TABLE)
    .select(USER_PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error && isMissingProfileColumn(error, ["bank_account", "direct_manager", "work_area"])) {
    ({ data, error } = await db
      .from(PERSONAL_PROFILES_TABLE)
      .select(USER_PROFILE_SELECT_NO_STAMMDATEN)
      .eq("user_id", userId)
      .maybeSingle());
  }

  if (error) {
    if (isMissingPersonalProfilesTable(error)) {
      return { profile: emptyProfileFields(), error: null, missingTable: true, missingRow: false };
    }
    return { profile: null, error: error.message, missingTable: false, missingRow: false };
  }

  if (!data) {
    return {
      profile: emptyProfileFields(),
      error: null,
      missingTable: false,
      missingRow: true,
    };
  }

  return {
    profile: profileFieldsFromRow(data),
    error: null,
    missingTable: false,
    missingRow: false,
  };
}

export async function seedPersonalProfileFromAdminRow(
  userId: string,
  adminRow: Record<string, unknown>
) {
  const db = getDb();
  if (!db) {
    return { ok: false, error: "Supabase ist nicht konfiguriert." };
  }
  const payload = {
    user_id: userId,
    ...profileFieldsFromRow(adminRow),
    updated_at: new Date().toISOString(),
  };

  const { error } = await db.from(PERSONAL_PROFILES_TABLE).upsert(payload, {
    onConflict: "user_id",
    ignoreDuplicates: true,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function updatePersonalProfile(userId: string, patch: UserProfilePatch) {
  const db = getDb();
  if (!db) {
    return {
      profile: null,
      error: "Supabase ist nicht konfiguriert.",
    };
  }

  if (patch.workArea !== undefined && patch.workArea !== null && patch.workArea !== "") {
    const area = normalizeUserWorkArea(patch.workArea);
    if (!area) {
      return { profile: null, error: "Ungültiger Arbeitsbereich. Erlaubt: Lager, Werkstatt." };
    }
  }

  const payload = userProfilePatchToDbPayload(patch);
  if (Object.keys(payload).length === 0) {
    return { profile: null, error: "Keine Änderungen übergeben." };
  }

  payload.updated_at = new Date().toISOString();

  const { data, error } = await db
    .from(PERSONAL_PROFILES_TABLE)
    .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" })
    .select(USER_PROFILE_SELECT)
    .single();

  if (error) {
    if (isMissingPersonalProfilesTable(error)) {
      return {
        profile: null,
        error:
          "Persönliches Profil fehlt. Bitte supabase/user-personal-profiles.sql ausführen.",
      };
    }
    return { profile: null, error: error.message };
  }

  return { profile: profileFieldsFromRow(data), error: null };
}

export async function syncPersonalProfilePositionFromAdmin(
  userId: string,
  position: string | null | undefined
) {
  const db = getDb();
  if (!db) {
    return { ok: false, error: null, missingTable: true };
  }
  const { error } = await db.from(PERSONAL_PROFILES_TABLE).upsert(
    {
      user_id: userId,
      position: typeof position === "string" ? position.trim() || null : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    if (isMissingPersonalProfilesTable(error)) {
      return { ok: false, error: null, missingTable: true };
    }
    return { ok: false, error: error.message, missingTable: false };
  }

  return { ok: true, error: null, missingTable: false };
}

export function mergeAuthUserWithPersonalProfile(
  authRow: Record<string, unknown>,
  profile: UserProfileFields
) {
  const merged: Record<string, unknown> = { ...authRow };
  for (const [key, value] of Object.entries(profile) as Array<
    [keyof UserProfileFields, UserProfileFields[keyof UserProfileFields]]
  >) {
    if (value !== null && value !== undefined && value !== "") {
      merged[key] = value;
    }
  }
  return merged;
}

export type { UserProfileFields, UserProfilePatch };
