import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildAuftragNrPrefix } from "../../../../lib/auftrag-nr";
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
  const allowed = await currentUserHasPermission(session.sub, "machines.write");
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

  const prefix = buildAuftragNrPrefix(type, depot, dateDe || undefined);
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc("next_arbeitsauftrag_nr", {
    p_prefix: prefix,
  });

  if (error) {
    const message = String(error.message ?? "");
    if (message.includes("next_arbeitsauftrag_nr") || message.includes("arbeitsauftrag_nr_counters")) {
      return NextResponse.json(
        {
          error:
            "Auftrag-Nr.-Tabelle fehlt. Bitte supabase/arbeitsauftrag-nr.sql in Supabase ausführen.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message || "Auftrag-Nr. konnte nicht erzeugt werden." }, { status: 500 });
  }

  const auftragNr = typeof data === "string" ? data : String(data ?? "");
  return NextResponse.json({ auftragNr, prefix });
}
