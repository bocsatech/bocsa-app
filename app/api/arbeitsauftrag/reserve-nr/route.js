import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  reserveLegacyAuftragNrWithFallback,
  reserveNewFormatAuftragNr,
} from "../../../../lib/auftrag-nr-server";
import { currentUserHasPermission } from "../../../../lib/auth/permissions";
import { SESSION_COOKIE } from "../../../../lib/auth/constants";
import { verifySessionToken } from "../../../../lib/auth/session";
import { normalizeGermanDate } from "../../../../lib/dates";
import { isStructuredGeraetenummer } from "../../../../lib/geraetenummer";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { normalizeUserFilialeCode } from "../../../../lib/user-filiale";

async function requireWrite() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);
  if (!session) {
    return { error: NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 }) };
  }
  const allowed = await currentUserHasPermission("machines.write");
  if (!allowed) {
    return {
      error: NextResponse.json(
        { error: "Keine Berechtigung: machines.write erforderlich." },
        { status: 403 }
      ),
    };
  }
  return { session };
}

async function resolveUserFilialeCode(supabase, session, body) {
  const fromBody = normalizeUserFilialeCode(body?.filialeCode ?? body?.filiale_code);
  if (fromBody) return fromBody;

  const { data, error } = await supabase
    .from("users")
    .select("filiale_code")
    .eq("id", session.userId)
    .maybeSingle();

  if (error) return null;
  return normalizeUserFilialeCode(data?.filiale_code);
}

export async function POST(request) {
  const auth = await requireWrite();
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const type = String(body?.type ?? "").trim();
  const depot = String(body?.depot ?? "").trim();
  const dateRaw = String(body?.date ?? "").trim();
  const dateDe = dateRaw ? normalizeGermanDate(dateRaw) ?? dateRaw : "";
  const useLegacy = body?.legacy === true || body?.pkw === true;

  if (!type) {
    return NextResponse.json({ error: "Auftragstyp fehlt." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase ist nicht konfiguriert." },
      { status: 503 }
    );
  }

  const ensureGlobalUnique = true;

  try {
    if (!useLegacy) {
      const geraetenummer = String(body?.geraetenummer ?? "").trim();
      const filialeCode = await resolveUserFilialeCode(supabase, auth.session, body);

      if (!geraetenummer) {
        return NextResponse.json(
          {
            error:
              "Gerätenummer fehlt. Auftrag-Nr. braucht MARKE-KLASSE-ART-00001 (z. B. KB-GG-BG15-00001).",
          },
          { status: 400 }
        );
      }
      if (!isStructuredGeraetenummer(geraetenummer)) {
        return NextResponse.json(
          {
            error:
              "Gerätenummer muss im Format MARKE-KLASSE-ART-00001 sein (z. B. KB-GG-BG15-00001).",
          },
          { status: 400 }
        );
      }
      if (!filialeCode) {
        return NextResponse.json(
          {
            error:
              "Filiale fehlt am Benutzerprofil. Bitte unter Benutzer eine Filiale (S/H/W) zuweisen.",
          },
          { status: 400 }
        );
      }

      const { auftragNr, prefix } = await reserveNewFormatAuftragNr(
        supabase,
        {
          type,
          filialeCode,
          geraetenummer,
          dateDe: dateDe || undefined,
        },
        [],
        { ensureGlobalUnique }
      );
      return NextResponse.json({ auftragNr, prefix });
    }

    if (!depot) {
      return NextResponse.json({ error: "Depot / Filiale fehlt." }, { status: 400 });
    }

    const { auftragNr, prefix } = await reserveLegacyAuftragNrWithFallback(
      supabase,
      type,
      depot,
      dateDe || undefined,
      [],
      { ensureGlobalUnique }
    );
    return NextResponse.json({ auftragNr, prefix });
  } catch (error) {
    const message = String(error?.message ?? "");
    return NextResponse.json(
      { error: message || "Auftrag-Nr. konnte nicht erzeugt werden." },
      { status: 500 }
    );
  }
}
