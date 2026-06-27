import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateAuftragNrGlobally } from "../../../../lib/auftrag-nr-server";
import { currentUserHasPermission } from "../../../../lib/auth/permissions";
import { SESSION_COOKIE } from "../../../../lib/auth/constants";
import { verifySessionToken } from "../../../../lib/auth/session";
import { isLocalhostRequest } from "../../../../lib/localhost-request";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

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
  if (!isLocalhostRequest(request)) {
    return NextResponse.json({ error: "Nur auf localhost verfügbar." }, { status: 404 });
  }

  const auth = await requireWrite();
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const auftragNr = String(body?.auftragNr ?? "").trim();
  const machineId = String(body?.machineId ?? "").trim() || undefined;
  const fahrzeugId = String(body?.fahrzeugId ?? "").trim() || undefined;
  const orderId = String(body?.orderId ?? "").trim() || undefined;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase ist nicht konfiguriert." },
      { status: 503 }
    );
  }

  try {
    const result = await validateAuftragNrGlobally(supabase, auftragNr, {
      machineId,
      fahrzeugId,
      orderId,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = String(error?.message ?? "");
    return NextResponse.json(
      { error: message || "Auftrag-Nr. konnte nicht geprüft werden." },
      { status: 500 }
    );
  }
}
