import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getCurrentSession } from "../../../../lib/auth/permissions";
import { updateUserById } from "../../../../lib/auth/users";
import { isLocalhostHost } from "../../../../lib/localhost-request";
import {
  loadUrlaubQuotaForUsername,
  normalizeOvertimeHours,
} from "../../../../lib/user-me-stats.mjs";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  loadPersonalProfile,
  mergeAuthUserWithPersonalProfile,
  updatePersonalProfile,
} from "../../../../lib/user-personal-profile";
import {
  parseUserProfilePatchFromBody,
  profileFieldsFromRow,
  validateAndNormalizeProfilePatch,
} from "../../../../lib/user-profile-fields";

const AUTH_USER_SELECT =
  "id, username, secret_pin, overtime_hours_balance, full_name, position, site, filiale_code, photo_url, signature_url, company_mobile, private_mobile, company_email, private_email, birth_date, address, ecard_number, emergency_contact_name, emergency_contact_phone, bank_account, direct_manager, work_area, created_at";
const AUTH_USER_SELECT_NO_STAMMDATEN =
  "id, username, secret_pin, full_name, position, site, filiale_code, photo_url, signature_url, company_mobile, private_mobile, company_email, private_email, birth_date, address, ecard_number, emergency_contact_name, emergency_contact_phone, created_at";
const AUTH_USER_SELECT_MINIMAL =
  "id, username, secret_pin, overtime_hours_balance, created_at";

function isMissingColumn(error, columns) {
  const msg = String(error?.message ?? "").toLowerCase();
  if (!columns.some((column) => msg.includes(column))) return false;
  return msg.includes("does not exist") || msg.includes("schema cache");
}

async function loadAuthUserRow(userId) {
  const db = getSupabaseAdmin();
  if (!db) {
    return { row: null, error: "Supabase ist nicht konfiguriert." };
  }

  let { data, error } = await db.from("users").select(AUTH_USER_SELECT).eq("id", userId).maybeSingle();

  if (error && isMissingColumn(error, ["overtime_hours_balance", "bank_account", "direct_manager", "work_area"])) {
    ({ data, error } = await db.from("users").select(AUTH_USER_SELECT_NO_STAMMDATEN).eq("id", userId).maybeSingle());
  }

  if (error && isMissingColumn(error, ["company_mobile", "filiale_code"])) {
    ({ data, error } = await db.from("users").select(AUTH_USER_SELECT_MINIMAL).eq("id", userId).maybeSingle());
  }

  if (error) {
    return { row: null, error: error.message };
  }
  if (!data) {
    return { row: null, error: "Benutzer nicht gefunden." };
  }

  return { row: data, error: null };
}

function urlaubQuotaOptions(authRow) {
  return {
    usePerUserQuota: true,
    annualDaysSource: authRow?.overtime_hours_balance,
  };
}

async function resolveLocalhostApiRequest() {
  try {
    const headerStore = await headers();
    const host =
      headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
    return isLocalhostHost(host);
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const db = getSupabaseAdmin();
    const { row: authRow, error: authError } = await loadAuthUserRow(session.userId);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 500 });
    }

    const personal = await loadPersonalProfile(session.userId);
    const mergedProfile =
      personal.error || personal.missingTable || personal.missingRow
        ? profileFieldsFromRow(authRow)
        : (personal.profile ?? profileFieldsFromRow(authRow));
    const user = mergeAuthUserWithPersonalProfile(authRow, mergedProfile);
    if (await resolveLocalhostApiRequest()) {
      user.position =
        typeof authRow.position === "string" ? authRow.position : authRow.position ?? null;
    }
    const urlaub = await loadUrlaubQuotaForUsername(
      db,
      session.username,
      urlaubQuotaOptions(authRow)
    );
    const overtimeHours = normalizeOvertimeHours(authRow.overtime_hours_balance);

    return NextResponse.json({
      user,
      urlaub,
      overtimeHours,
      profileWarning: personal.error ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Profil konnte nicht geladen werden.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const password = String(body.password ?? "");
  if (password && password.length < 6) {
    return NextResponse.json(
      { error: "Passwort muss mindestens 6 Zeichen haben." },
      { status: 400 }
    );
  }

  const rawProfilePatch = parseUserProfilePatchFromBody(body);
  const { patch: profilePatch, error: profileValidationError } =
    validateAndNormalizeProfilePatch(rawProfilePatch);
  if (profileValidationError) {
    return NextResponse.json({ error: profileValidationError }, { status: 400 });
  }

  if (await resolveLocalhostApiRequest()) {
    delete profilePatch.position;
  }

  const authPatch = {
    password: password || undefined,
    secretPin: body.secretPin ?? body.secret_pin,
  };

  const hasAuthChanges =
    authPatch.password !== undefined || authPatch.secretPin !== undefined;
  const hasProfileChanges = Object.values(profilePatch).some((value) => value !== undefined);

  if (!hasAuthChanges && !hasProfileChanges) {
    return NextResponse.json({ error: "Keine Änderungen übergeben." }, { status: 400 });
  }

  if (hasAuthChanges) {
    const { error: authError } = await updateUserById(session.userId, authPatch);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 400 });
    }
  }

  let profile = null;
  if (hasProfileChanges) {
    const { profile: updatedProfile, error: profileError } = await updatePersonalProfile(
      session.userId,
      profilePatch
    );
    if (profileError) {
      return NextResponse.json({ error: profileError }, { status: 400 });
    }
    profile = updatedProfile;
  } else {
    const loaded = await loadPersonalProfile(session.userId);
    profile = loaded.profile;
  }

  const { row: authRow, error: authError } = await loadAuthUserRow(session.userId);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: 500 });
  }

  const db = getSupabaseAdmin();
  const urlaub = await loadUrlaubQuotaForUsername(
    db,
    session.username,
    urlaubQuotaOptions(authRow)
  );
  const user = mergeAuthUserWithPersonalProfile(authRow, profile ?? profileFieldsFromRow(authRow));
  if (await resolveLocalhostApiRequest()) {
    user.position =
      typeof authRow.position === "string" ? authRow.position : authRow.position ?? null;
  }

  return NextResponse.json({
    user,
    urlaub,
    overtimeHours: normalizeOvertimeHours(authRow.overtime_hours_balance),
  });
}
