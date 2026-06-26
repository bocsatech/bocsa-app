import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../lib/auth/permissions";
import { updateUserById } from "../../../../lib/auth/users";
import {
  loadUrlaubQuotaForUsername,
  normalizeOvertimeHours,
} from "../../../../lib/user-me-stats.mjs";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  buildMeUserFromAuthAndPersonal,
  updatePersonalProfile,
} from "../../../../lib/user-personal-profile";
import {
  parseUserProfilePatchFromBody,
  profilePatchToUserUpdate,
  validateAndNormalizeProfilePatch,
} from "../../../../lib/user-profile-fields";

const AUTH_USER_SELECT =
  "id, username, secret_pin, overtime_hours_balance, full_name, position, site, filiale_code, photo_url, signature_url, company_mobile, private_mobile, company_email, private_email, birth_date, address, ecard_number, emergency_contact_name, emergency_contact_phone, bank_account, direct_manager, work_area, created_at";
const AUTH_USER_SELECT_NO_STAMMDATEN =
  "id, username, secret_pin, full_name, position, site, filiale_code, photo_url, signature_url, company_mobile, private_mobile, company_email, private_email, birth_date, address, ecard_number, emergency_contact_name, emergency_contact_phone, created_at";
const AUTH_USER_SELECT_MINIMAL =
  "id, username, secret_pin, overtime_hours_balance, created_at";
const AUTH_USER_SELECT_CORE =
  "id, username, secret_pin, full_name, position, site, photo_url, signature_url, created_at";

async function loadAuthUserRow(userId) {
  const db = getSupabaseAdmin();
  if (!db) {
    return { row: null, error: "Supabase ist nicht konfiguriert." };
  }

  const selects = [
    AUTH_USER_SELECT,
    AUTH_USER_SELECT_NO_STAMMDATEN,
    AUTH_USER_SELECT_MINIMAL,
    AUTH_USER_SELECT_CORE,
  ];

  let lastError = null;
  for (const select of selects) {
    const { data, error } = await db.from("users").select(select).eq("id", userId).maybeSingle();
    if (!error && data) {
      return { row: data, error: null };
    }
    if (error) {
      lastError = error.message;
    }
  }

  if (lastError) {
    return { row: null, error: lastError };
  }
  return { row: null, error: "Benutzer nicht gefunden." };
}

function urlaubQuotaOptions(authRow) {
  return {
    usePerUserQuota: true,
    annualDaysSource: authRow?.overtime_hours_balance,
  };
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

    const user = await buildMeUserFromAuthAndPersonal(authRow, session.userId);
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

  delete profilePatch.position;

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

  if (hasProfileChanges) {
    const { error: profileError } = await updatePersonalProfile(session.userId, profilePatch);
    if (profileError) {
      const { error: userError } = await updateUserById(
        session.userId,
        profilePatchToUserUpdate(profilePatch)
      );
      if (userError) {
        return NextResponse.json({ error: userError }, { status: 400 });
      }
    }
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
  const user = await buildMeUserFromAuthAndPersonal(authRow, session.userId);

  return NextResponse.json({
    user,
    urlaub,
    overtimeHours: normalizeOvertimeHours(authRow.overtime_hours_balance),
  });
}
