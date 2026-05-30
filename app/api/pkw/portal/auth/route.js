import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import {
  createPkwPortalToken,
  PKW_PORTAL_COOKIE,
  pkwPortalCookieOptions,
} from "../../../../../lib/auth/pkw-portal";
import { normalizeKennzeichen, verifyPortalPin } from "../../../../../lib/pkw-server.mjs";

export async function POST(request) {
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const kennzeichen = normalizeKennzeichen(body.kennzeichen);
  const pin = String(body.pin ?? "").trim();

  if (!kennzeichen || !pin) {
    return NextResponse.json({ error: "Kennzeichen und PIN erforderlich." }, { status: 400 });
  }

  const { data: fahrzeug, error } = await db
    .from("pkw_fahrzeuge")
    .select("*, kunde:kunden(*)")
    .eq("kennzeichen", kennzeichen)
    .eq("aktiv", true)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!fahrzeug) {
    return NextResponse.json(
      { error: "Fahrzeug nicht gefunden. Bitte Werkstatt kontaktieren." },
      { status: 404 }
    );
  }

  const kunde = fahrzeug.kunde;
  const hash = kunde?.portal_pin_hash;

  if (!hash) {
    return NextResponse.json(
      { error: "Für dieses Fahrzeug ist noch kein Portal-PIN hinterlegt." },
      { status: 403 }
    );
  }

  const ok = await verifyPortalPin(pin, hash);
  if (!ok) {
    return NextResponse.json({ error: "Kennzeichen oder PIN falsch." }, { status: 401 });
  }

  const token = await createPkwPortalToken({
    fahrzeugId: fahrzeug.id,
    kennzeichen: fahrzeug.kennzeichen,
    kundeId: fahrzeug.kunde_id,
  });

  const response = NextResponse.json({
    fahrzeug: {
      id: fahrzeug.id,
      kennzeichen: fahrzeug.kennzeichen,
      marke: fahrzeug.marke,
      modell: fahrzeug.modell,
      km_stand: fahrzeug.km_stand,
    },
    kunde: kunde
      ? {
          id: kunde.id,
          vorname: kunde.vorname,
          nachname: kunde.nachname,
          firma: kunde.firma,
        }
      : null,
  });

  response.cookies.set(PKW_PORTAL_COOKIE, token, pkwPortalCookieOptions());
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PKW_PORTAL_COOKIE, "", { ...pkwPortalCookieOptions(), maxAge: 0 });
  return response;
}
