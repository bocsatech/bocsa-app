import { NextResponse } from "next/server";
import { currentUserCanManageUsers } from "../../../../lib/auth/permissions";
import { updateUserById } from "../../../../lib/auth/users";

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

  const { user, error } = await updateUserById(id, {
    password: password || undefined,
    secretPin: body.secretPin ?? body.secret_pin,
    fullName:
      body.fullName !== undefined
        ? String(body.fullName ?? "")
        : undefined,
    position:
      body.position !== undefined
        ? String(body.position ?? "")
        : undefined,
    site:
      body.site !== undefined
        ? String(body.site ?? "")
        : undefined,
    photoUrl:
      body.photoUrl !== undefined
        ? String(body.photoUrl ?? "")
        : undefined,
    signatureUrl:
      body.signatureUrl !== undefined
        ? String(body.signatureUrl ?? "")
        : undefined,
  });

  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ user });
}

