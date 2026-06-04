import { NextResponse } from "next/server";
import { currentUserCanManageUsers } from "../../../lib/auth/permissions";
import { normalizeSecretPin } from "../../../lib/auth/pin";
import { createUser, findUserByUsername, listUsers } from "../../../lib/auth/users";
import { normalizeUserFilialeCode } from "../../../lib/user-filiale";

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
  const filialeCode =
    filialeRaw === null || filialeRaw === ""
      ? null
      : normalizeUserFilialeCode(filialeRaw);

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

  if (filialeRaw !== undefined && filialeRaw !== null && filialeRaw !== "" && !filialeCode) {
    return NextResponse.json(
      { error: "Ungültige Filiale. Erlaubt: S (Schwechat), H (Horn), W (Wien)." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Passwort muss mindestens 6 Zeichen haben." },
      { status: 400 }
    );
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

  const { user, error } = await createUser(username, password, secretPin, filialeCode);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ user });
}
