import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { updateUserById } from "../../../../lib/auth/users";
import { normalizeUserFilialeCode } from "../../../../lib/user-filiale";

const USER_SELECT =
  "id, username, secret_pin, full_name, position, site, filiale_code, photo_url, signature_url, created_at";
const USER_SELECT_LEGACY =
  "id, username, secret_pin, full_name, position, site, photo_url, signature_url, created_at";

function isMissingFilialeColumn(error) {
  const msg = String(error?.message ?? "").toLowerCase();
  return msg.includes("filiale_code") && msg.includes("does not exist");
}

async function loadOwnProfile(userId) {
  const db = getSupabaseAdmin();
  if (!db) {
    return { user: null, error: "Supabase ist nicht konfiguriert." };
  }

  let { data, error } = await db
    .from("users")
    .select(USER_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error && isMissingFilialeColumn(error)) {
    ({ data, error } = await db
      .from("users")
      .select(USER_SELECT_LEGACY)
      .eq("id", userId)
      .maybeSingle());
  }

  if (error) {
    return { user: null, error: error.message };
  }
  if (!data) {
    return { user: null, error: "Benutzer nicht gefunden." };
  }

  return { user: data, error: null };
}

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { user, error } = await loadOwnProfile(session.userId);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ user });
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

  const { user, error } = await updateUserById(session.userId, {
    password: password || undefined,
    secretPin: body.secretPin ?? body.secret_pin,
    fullName: body.fullName !== undefined ? String(body.fullName ?? "") : undefined,
    position: body.position !== undefined ? String(body.position ?? "") : undefined,
    site: body.site !== undefined ? String(body.site ?? "") : undefined,
    filialeCode,
    photoUrl: body.photoUrl !== undefined ? String(body.photoUrl ?? "") : undefined,
    signatureUrl:
      body.signatureUrl !== undefined ? String(body.signatureUrl ?? "") : undefined,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ user });
}
