import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { updateUserById } from "../../../../lib/auth/users";
import { normalizeUserFilialeCode } from "../../../../lib/user-filiale";
import { normalizeGermanDate } from "../../../../lib/dates";

const USER_PERSONAL_COLUMNS =
  "company_mobile, private_mobile, company_email, private_email, birth_date, address, ecard_number, emergency_contact_name, emergency_contact_phone";

const USER_SELECT =
  `id, username, secret_pin, full_name, position, site, filiale_code, photo_url, signature_url, ${USER_PERSONAL_COLUMNS}, created_at`;
const USER_SELECT_NO_PERSONAL =
  "id, username, secret_pin, full_name, position, site, filiale_code, photo_url, signature_url, created_at";
const USER_SELECT_LEGACY =
  "id, username, secret_pin, full_name, position, site, photo_url, signature_url, created_at";

function isMissingFilialeColumn(error) {
  const msg = String(error?.message ?? "").toLowerCase();
  return msg.includes("filiale_code") && msg.includes("does not exist");
}

function isMissingPersonalColumn(error) {
  const msg = String(error?.message ?? "").toLowerCase();
  const personalColumns = [
    "company_mobile",
    "private_mobile",
    "company_email",
    "private_email",
    "birth_date",
    "address",
    "ecard_number",
    "emergency_contact_name",
    "emergency_contact_phone",
  ];
  if (!personalColumns.some((column) => msg.includes(column))) return false;
  return msg.includes("does not exist") || msg.includes("schema cache");
}

function optionalText(value) {
  if (value === undefined) return undefined;
  const text = String(value ?? "").trim();
  return text || null;
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
      .select(USER_SELECT_NO_PERSONAL)
      .eq("id", userId)
      .maybeSingle());
  }

  if (error && isMissingPersonalColumn(error)) {
    ({ data, error } = await db
      .from("users")
      .select(USER_SELECT_NO_PERSONAL)
      .eq("id", userId)
      .maybeSingle());
  }

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

  let birthDate;
  if (body.birthDate !== undefined || body.birth_date !== undefined) {
    const raw = body.birthDate ?? body.birth_date ?? "";
    if (raw === null || String(raw).trim() === "") {
      birthDate = null;
    } else {
      const normalized = normalizeGermanDate(raw);
      if (!normalized) {
        return NextResponse.json(
          { error: "Geburtstag muss im Format TT.MM.JJJJ sein." },
          { status: 400 }
        );
      }
      birthDate = normalized;
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
    birthDate,
    address:
      body.address !== undefined ? optionalText(body.address) : undefined,
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
  });

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ user });
}
