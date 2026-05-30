import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { reserveAuftragNrWithFallback } from "../../../../lib/auftrag-nr-server";
import { currentUserHasPermission } from "../../../../lib/auth/permissions";
import { SESSION_COOKIE } from "../../../../lib/auth/constants";
import { verifySessionToken } from "../../../../lib/auth/session";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { normalizeGermanDate } from "../../../../lib/dates";

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

  if (!type) {
    return NextResponse.json({ error: "Auftragstyp fehlt." }, { status: 400 });
  }
  if (!depot) {
    return NextResponse.json({ error: "Depot / Filiale fehlt." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase ist nicht konfiguriert." },
      { status: 503 }
    );
  }

  try {
    const { auftragNr, prefix } = await reserveAuftragNrWithFallback(
      supabase,
      type,
      depot,
      dateDe || undefined
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
