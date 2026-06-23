import { NextResponse } from "next/server";
import {
  currentUserCanManageUsers,
  getCurrentSession,
} from "../../../../lib/auth/permissions";
import { deleteUserById, updateUserById } from "../../../../lib/auth/users";
import { normalizeUserFilialeCode } from "../../../../lib/user-filiale";

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

  const filialeRaw = body.filialeCode ?? body.filiale_code;
  let filialeCode;
  if (filialeRaw !== undefined) {
    if (filialeRaw === null || filialeRaw === "") {
      filialeCode = null;
    } else {
      filialeCode = normalizeUserFilialeCode(filialeRaw);
      if (!filialeCode) {
        return NextResponse.json(
          { error: "Ungültige Filiale. Erlaubt: S (Schwechat), H (Horn), W (Wien)." },
          { status: 400 }
        );
      }
    }
  }

  let isActive;
  if (body.isActive !== undefined || body.is_active !== undefined) {
    const raw = body.isActive ?? body.is_active;
    isActive = raw === true || raw === "true" || raw === 1 || raw === "1";
  }

  const { user, error } = await updateUserById(id, {
    username:
      body.username !== undefined ? String(body.username ?? "") : undefined,
    isActive,
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
    filialeCode,
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
