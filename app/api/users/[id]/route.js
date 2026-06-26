import { NextResponse } from "next/server";
import {
  currentUserCanManageUsers,
  getCurrentSession,
} from "../../../../lib/auth/permissions";
import { deleteUserById, updateUserById } from "../../../../lib/auth/users";
import {
  parseUserProfilePatchFromBody,
  validateAndNormalizeProfilePatch,
} from "../../../../lib/user-profile-fields";

export async function PATCH(request, { params }) {
  if (!(await currentUserCanManageUsers())) {
    return NextResponse.json(
      { error: "Keine Berechtigung: users.write erforderlich." },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Benutzer-ID fehlt." }, { status: 400 });
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

  let isActive;
  if (body.isActive !== undefined || body.is_active !== undefined) {
    const raw = body.isActive ?? body.is_active;
    isActive = raw === true || raw === "true" || raw === 1 || raw === "1";
  }

  const rawProfilePatch = parseUserProfilePatchFromBody(body);
  const { patch: profile, error: profileValidationError } =
    validateAndNormalizeProfilePatch(rawProfilePatch);
  if (profileValidationError) {
    return NextResponse.json({ error: profileValidationError }, { status: 400 });
  }

  let overtimeHoursBalance;
  if (body.overtimeHoursBalance !== undefined || body.overtime_hours_balance !== undefined) {
    const raw = body.overtimeHoursBalance ?? body.overtime_hours_balance;
    const numeric = Number(raw);
    overtimeHoursBalance = Number.isFinite(numeric) ? numeric : 0;
  }

  const { user, error } = await updateUserById(id, {
    username:
      body.username !== undefined ? String(body.username ?? "") : undefined,
    isActive,
    password: password || undefined,
    secretPin: body.secretPin ?? body.secret_pin,
    fullName: profile.fullName,
    position: profile.position,
    site: profile.site,
    filialeCode: profile.filialeCode,
    photoUrl: profile.photoUrl,
    signatureUrl: profile.signatureUrl,
    companyMobile: profile.companyMobile,
    privateMobile: profile.privateMobile,
    companyEmail: profile.companyEmail,
    privateEmail: profile.privateEmail,
    birthDate: profile.birthDate,
    address: profile.address,
    ecardNumber: profile.ecardNumber,
    emergencyContactName: profile.emergencyContactName,
    emergencyContactPhone: profile.emergencyContactPhone,
    bankAccount: profile.bankAccount,
    directManager: profile.directManager,
    workArea: profile.workArea,
    overtimeHoursBalance,
  });

  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ user });
}

export async function DELETE(_request, { params }) {
  if (!(await currentUserCanManageUsers())) {
    return NextResponse.json(
      { error: "Keine Berechtigung: users.write erforderlich." },
      { status: 403 }
    );
  }

  const session = await getCurrentSession();
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Benutzer-ID fehlt." }, { status: 400 });
  }

  if (session?.userId === id) {
    return NextResponse.json(
      { error: "Sie können Ihren eigenen Benutzer nicht löschen." },
      { status: 400 }
    );
  }

  const { ok, error } = await deleteUserById(id);
  if (!ok) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
