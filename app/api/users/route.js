import { NextResponse } from "next/server";
import { currentUserCanManageUsers } from "../../../lib/auth/permissions";
import { normalizeSecretPin } from "../../../lib/auth/pin";
import { createUser, findUserByUsername, listUsers } from "../../../lib/auth/users";
import { normalizeUserFilialeCode } from "../../../lib/user-filiale";
import {
  parseUserProfilePatchFromBody,
  validateAndNormalizeProfilePatch,
} from "../../../lib/user-profile-fields";

export async function GET() {
  if (!(await currentUserCanManageUsers())) {
    return NextResponse.json(
      { error: "Keine Berechtigung: users.read/users.write erforderlich." },
      { status: 403 }
    );
  }

  const { users, error } = await listUsers();
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ users });
}

export async function POST(request) {
  if (!(await currentUserCanManageUsers())) {
    return NextResponse.json(
      { error: "Keine Berechtigung: users.write erforderlich." },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  const secretPin = normalizeSecretPin(body.secretPin ?? body.secret_pin);
  const filialeRaw = body.filialeCode ?? body.filiale_code;

  if (!username || !password) {
    return NextResponse.json(
      { error: "Benutzername und Passwort sind erforderlich." },
      { status: 400 }
    );
  }

  if (secretPin === null) {
    return NextResponse.json(
      { error: "Geheimzahl (0–99) ist erforderlich." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Passwort muss mindestens 6 Zeichen haben." },
      { status: 400 }
    );
  }

  const rawProfilePatch = parseUserProfilePatchFromBody(body);
  const { patch: profile, error: profileValidationError } =
    validateAndNormalizeProfilePatch(rawProfilePatch);
  if (profileValidationError) {
    return NextResponse.json({ error: profileValidationError }, { status: 400 });
  }

  let filialeCode = null;
  if (filialeRaw !== undefined && filialeRaw !== null && filialeRaw !== "") {
    filialeCode = normalizeUserFilialeCode(filialeRaw);
    if (!filialeCode) {
      return NextResponse.json(
        { error: "Ungültige Filiale. Erlaubt: S (Schwechat), H (Horn), W (Wien)." },
        { status: 400 }
      );
    }
  } else if (profile.filialeCode !== undefined && profile.filialeCode !== null && profile.filialeCode !== "") {
    filialeCode = profile.filialeCode;
  }

  let overtimeHoursBalance;
  if (body.overtimeHoursBalance !== undefined || body.overtime_hours_balance !== undefined) {
    const raw = body.overtimeHoursBalance ?? body.overtime_hours_balance;
    const numeric = Number(raw);
    overtimeHoursBalance = Number.isFinite(numeric) ? numeric : 0;
  }

  const existing = await findUserByUsername(username);
  if (existing.error) {
    return NextResponse.json({ error: existing.error }, { status: 500 });
  }
  if (existing.user) {
    return NextResponse.json(
      { error: "Benutzername ist bereits vergeben." },
      { status: 409 }
    );
  }

  const { user, error } = await createUser(username, password, secretPin, {
    filialeCode,
    profile: {
      ...profile,
      filialeCode: filialeCode ?? profile.filialeCode ?? null,
    },
    overtimeHoursBalance,
  });
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ user });
}
